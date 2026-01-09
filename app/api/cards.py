"""
Cards API endpoints
"""
from fastapi import APIRouter, HTTPException
from app.models.cards import CardResponse, CardListResponse
from app.database import read_data_from_database, read_tags

router = APIRouter(prefix="/api/cards", tags=["cards"])


@router.get("", response_model=CardListResponse)
async def get_cards():
    """Get card details"""
    try:
        # Get tags for cards
        ip_tags_dict = await read_tags(type_of_update="card")
        
        # Read card data from database
        records = await read_data_from_database(table_name="chassis_card_details")
        
        # Helper function to convert 'NA' or invalid values to None for integers
        def to_int_or_none(value):
            if value is None or value == '' or value == 'NA':
                return None
            try:
                return int(value)
            except (ValueError, TypeError):
                return None
        
        # Transform records to response format
        list_of_cards = []
        for record in records:
            tags = record.get("tags", "")
            tags_list = tags.split(",") if tags else []
            
            # Merge tags from ip_tags_dict if available
            if record.get("serialNumber") in ip_tags_dict:
                tags_list = ip_tags_dict[record["serialNumber"]]
            
            card_data = {
                "chassisIp": record["chassisIp"],
                "chassisType": record.get("typeOfChassis", "NA"),
                "cardNumber": to_int_or_none(record.get("cardNumber")),
                "serialNumber": record.get("serialNumber", "NA"),
                "cardType": record.get("cardType", "NA"),
                "cardState": record.get("cardState", "NA"),
                "numberOfPorts": to_int_or_none(record.get("numberOfPorts")),
                "lastUpdatedAt_UTC": record.get("lastUpdatedAt_UTC", ""),
                "tags": tags_list
            }
            list_of_cards.append(CardResponse(**card_data))
        
        return CardListResponse(cards=list_of_cards, count=len(list_of_cards))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching card data: {str(e)}")

