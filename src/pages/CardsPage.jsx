import { useState, useMemo } from 'react'
import { useApi, useMutation } from '@/hooks/use-api'
import { getCards, pollCards, addTags, removeTags } from '@/lib/api/endpoints'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { RefreshCw, Plus, X, Search, Download, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { exportToCSV } from '@/lib/utils'

function CardsPage() {
  const { data, loading, error, refetch } = useApi(getCards)
  const { mutate: pollMutate } = useMutation(pollCards)
  const { mutate: addTagsMutate } = useMutation(addTags)
  const { mutate: removeTagsMutate } = useMutation(removeTags)
  const { toast } = useToast()
  
  const [searchTerm, setSearchTerm] = useState('')
  const [tagDialogOpen, setTagDialogOpen] = useState(false)
  const [selectedCard, setSelectedCard] = useState(null)
  const [newTags, setNewTags] = useState('')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [sortColumn, setSortColumn] = useState(null)
  const [sortDirection, setSortDirection] = useState('asc')

  const cardsList = data?.cards || []

  const filteredCards = useMemo(() => {
    if (!searchTerm) return cardsList
    
    const term = searchTerm.toLowerCase()
    return cardsList.filter((card) => {
      return (
        card.chassisIp?.toLowerCase().includes(term) ||
        card.serialNumber?.toLowerCase().includes(term) ||
        card.cardType?.toLowerCase().includes(term) ||
        card.chassisType?.toLowerCase().includes(term)
      )
    })
  }, [cardsList, searchTerm])

  const sortedCards = useMemo(() => {
    if (!sortColumn) return filteredCards
    
    return [...filteredCards].sort((a, b) => {
      let aValue = a[sortColumn] ?? ''
      let bValue = b[sortColumn] ?? ''
      
      const aStr = String(aValue).toLowerCase()
      const bStr = String(bValue).toLowerCase()
      
      if (aStr < bStr) return sortDirection === 'asc' ? -1 : 1
      if (aStr > bStr) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
  }, [filteredCards, sortColumn, sortDirection])

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const getSortIcon = (column) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="h-4 w-4 ml-1 inline opacity-50" />
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-4 w-4 ml-1 inline" />
      : <ArrowDown className="h-4 w-4 ml-1 inline" />
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await pollMutate({}, {
        onSuccess: () => {
          setTimeout(() => {
            refetch()
            setIsRefreshing(false)
            toast({
              title: 'Success',
              description: 'Card data refreshed successfully',
            })
          }, 2000)
        },
        onError: () => {
          setIsRefreshing(false)
        }
      })
    } catch (err) {
      setIsRefreshing(false)
    }
  }

  const handleAddTags = () => {
    if (!selectedCard || !newTags.trim()) return

    addTagsMutate({
      serialNumber: selectedCard.serialNumber,
      tags: newTags.trim(),
    }, {
      onSuccess: () => {
        toast({
          title: 'Success',
          description: 'Tags added successfully',
        })
        setTagDialogOpen(false)
        setNewTags('')
        setSelectedCard(null)
        refetch()
      }
    })
  }

  const handleRemoveTags = (card, tagsToRemove) => {
    removeTagsMutate({
      serialNumber: card.serialNumber,
      tags: tagsToRemove,
    }, {
      onSuccess: () => {
        toast({
          title: 'Success',
          description: 'Tags removed successfully',
        })
        refetch()
      }
    })
  }

  const openTagDialog = (card) => {
    setSelectedCard(card)
    setNewTags('')
    setTagDialogOpen(true)
  }

  const handleExport = () => {
    if (filteredCards.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No data to export',
      })
      return
    }

    const headers = [
      { key: 'chassisIp', label: 'Chassis IP' },
      { key: 'chassisType', label: 'Chassis Type' },
      { key: 'cardNumber', label: 'Card Number' },
      { key: 'serialNumber', label: 'Serial Number' },
      { key: 'cardType', label: 'Card Type' },
      { key: 'cardState', label: 'Card State' },
      { key: 'numberOfPorts', label: 'Number of Ports' },
      { key: 'tags', label: 'Tags' },
    ]

    const exportData = sortedCards.map(card => ({
      chassisIp: card.chassisIp,
      chassisType: card.chassisType,
      cardNumber: card.cardNumber,
      serialNumber: card.serialNumber,
      cardType: card.cardType,
      cardState: card.cardState,
      numberOfPorts: card.numberOfPorts,
      tags: card.tags && card.tags.length > 0 ? card.tags.join('; ') : 'No tags',
    }))

    exportToCSV(exportData, headers, `cards_export_${new Date().toISOString().split('T')[0]}.csv`)
    toast({
      title: 'Success',
      description: 'Card data exported successfully',
    })
  }

  if (loading && !cardsList.length) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading card data...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-destructive">Error loading card data: {error}</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-teal-400 bg-clip-text text-transparent">Card Details</h1>
        <div className="flex gap-2">
          <Button
            onClick={handleExport}
            variant="outline"
            disabled={sortedCards.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Export to Excel
          </Button>
          <Button onClick={handleRefresh} disabled={isRefreshing} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by IP, Serial Number, Card Type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('chassisIp')}>
                    Chassis IP{getSortIcon('chassisIp')}
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('chassisType')}>
                    Chassis Type{getSortIcon('chassisType')}
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('cardNumber')}>
                    Card Number{getSortIcon('cardNumber')}
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('serialNumber')}>
                    Serial Number{getSortIcon('serialNumber')}
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('cardType')}>
                    Card Type{getSortIcon('cardType')}
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('cardState')}>
                    Card State{getSortIcon('cardState')}
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('numberOfPorts')}>
                    Number of Ports{getSortIcon('numberOfPorts')}
                  </TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedCards.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground">
                      No cards found
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedCards.map((card) => (
                    <TableRow key={`${card.chassisIp}-${card.cardNumber}`}>
                      <TableCell className="font-medium">{card.chassisIp}</TableCell>
                      <TableCell>{card.chassisType}</TableCell>
                      <TableCell>{card.cardNumber}</TableCell>
                      <TableCell>{card.serialNumber}</TableCell>
                      <TableCell>{card.cardType}</TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            card.cardState === 'UP' || card.cardState === 'Up'
                              ? 'bg-green-100 text-green-800'
                              : card.cardState === 'DOWN' || card.cardState === 'Down'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {card.cardState}
                        </span>
                      </TableCell>
                      <TableCell>{card.numberOfPorts}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {card.tags && card.tags.length > 0 ? (
                            card.tags.map((tag, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-secondary text-secondary-foreground rounded text-xs"
                              >
                                {tag}
                                <button
                                  onClick={() => handleRemoveTags(card, tag)}
                                  className="hover:text-destructive"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground">No tags</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openTagDialog(card)}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add Tag
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="mt-4 text-sm text-muted-foreground">
            Showing {sortedCards.length} of {cardsList.length} cards
          </div>
        </CardContent>
      </Card>

      <Dialog open={tagDialogOpen} onOpenChange={setTagDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Tags</DialogTitle>
            <DialogDescription>
              Add tags for card {selectedCard?.serialNumber}. Separate multiple tags with commas.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="e.g., production, lab, test"
              value={newTags}
              onChange={(e) => setNewTags(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTagDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddTags}>Add Tags</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default CardsPage
