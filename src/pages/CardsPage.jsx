import { useState, useMemo } from 'react'
import { useApi, useMutation } from '@/hooks/use-api'
import { getCards, pollCards, addTags, removeTags } from '@/lib/api/endpoints'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
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
import { StatusBadge } from '@/components/ui/status-badge'

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
  
  // Column-based filters
  const [filters, setFilters] = useState({
    chassisIp: '',
    chassisType: '',
    cardNumber: '',
    serialNumber: '',
    cardType: '',
    cardState: '',
    numberOfPorts: '',
    tags: ''
  })

  const cardsList = data?.cards || []

  // Get unique values for each column
  const columnValues = useMemo(() => {
    const values = {
      chassisIp: new Set(),
      chassisType: new Set(),
      cardNumber: new Set(),
      serialNumber: new Set(),
      cardType: new Set(),
      cardState: new Set(),
      numberOfPorts: new Set(),
      tags: new Set()
    }

    cardsList.forEach((card) => {
      if (card.chassisIp) values.chassisIp.add(card.chassisIp)
      if (card.chassisType && card.chassisType !== 'NA') values.chassisType.add(card.chassisType)
      if (card.cardNumber !== undefined && card.cardNumber !== null && card.cardNumber !== 'NA') values.cardNumber.add(card.cardNumber.toString())
      if (card.serialNumber && card.serialNumber !== 'NA') values.serialNumber.add(card.serialNumber)
      if (card.cardType && card.cardType !== 'NA') values.cardType.add(card.cardType)
      if (card.cardState && card.cardState !== 'NA') values.cardState.add(card.cardState)
      if (card.numberOfPorts !== undefined && card.numberOfPorts !== null && card.numberOfPorts !== 'NA') values.numberOfPorts.add(card.numberOfPorts.toString())
      if (card.tags && card.tags.length > 0) {
        card.tags.forEach(tag => values.tags.add(tag))
      }
    })

    return Object.fromEntries(
      Object.entries(values).map(([key, set]) => [key, Array.from(set).sort()])
    )
  }, [cardsList])

  // Filter cards based on column filters and search term
  const filteredCards = useMemo(() => {
    let filtered = cardsList

    // Apply column-based filters (AND logic)
    Object.entries(filters).forEach(([column, filterValue]) => {
      if (filterValue && filterValue !== '') {
        filtered = filtered.filter((card) => {
          switch (column) {
            case 'chassisIp':
              return card.chassisIp === filterValue
            case 'chassisType':
              return card.chassisType === filterValue
            case 'cardNumber':
              return card.cardNumber !== null && card.cardNumber !== undefined && card.cardNumber?.toString() === filterValue
            case 'serialNumber':
              return card.serialNumber === filterValue
            case 'cardType':
              return card.cardType === filterValue
            case 'cardState':
              return card.cardState === filterValue
            case 'numberOfPorts':
              return card.numberOfPorts !== null && card.numberOfPorts !== undefined && card.numberOfPorts?.toString() === filterValue
            case 'tags':
              return card.tags && card.tags.includes(filterValue)
            default:
              return true
          }
        })
      }
    })

    // Apply search term filter
    if (searchTerm) {
    const term = searchTerm.toLowerCase()
      filtered = filtered.filter((card) => {
      return (
        card.chassisIp?.toLowerCase().includes(term) ||
        card.serialNumber?.toLowerCase().includes(term) ||
        card.cardType?.toLowerCase().includes(term) ||
        card.chassisType?.toLowerCase().includes(term)
      )
    })
    }

    return filtered
  }, [cardsList, filters, searchTerm])

  const handleFilterChange = (column, value) => {
    setFilters(prev => ({
      ...prev,
      [column]: value === 'all' ? '' : value
    }))
  }

  const clearAllFilters = () => {
    setFilters({
      chassisIp: '',
      chassisType: '',
      cardNumber: '',
      serialNumber: '',
      cardType: '',
      cardState: '',
      numberOfPorts: '',
      tags: ''
    })
    setSearchTerm('')
  }

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
      cardNumber: card.cardNumber ?? 'N/A',
      serialNumber: card.serialNumber,
      cardType: card.cardType,
      cardState: card.cardState,
      numberOfPorts: card.numberOfPorts ?? 'N/A',
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
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by IP, Serial Number, Card Type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
              </div>
              {(Object.values(filters).some(f => f !== '') || searchTerm) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAllFilters}
                  className="whitespace-nowrap"
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear Filters
                </Button>
              )}
            </div>
            
            {/* Column-based filter dropdowns */}
            <div className="flex gap-2 pt-3 border-t border-border/40 overflow-x-auto pb-2">
              <Select
                value={filters.chassisIp || 'all'}
                onChange={(e) => handleFilterChange('chassisIp', e.target.value)}
                className="min-w-[140px] text-xs bg-muted/60 border-cyan-500/30"
                title="Filter by Chassis IP"
              >
                <option value="all">Select All (IP)</option>
                {columnValues.chassisIp.map((ip) => (
                  <option key={ip} value={ip}>{ip}</option>
                ))}
              </Select>
              <Select
                value={filters.chassisType || 'all'}
                onChange={(e) => handleFilterChange('chassisType', e.target.value)}
                className="min-w-[120px] text-xs bg-muted/60 border-cyan-500/30"
                title="Filter by Chassis Type"
              >
                <option value="all">Select All (Type)</option>
                {columnValues.chassisType.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </Select>
              <Select
                value={filters.cardNumber || 'all'}
                onChange={(e) => handleFilterChange('cardNumber', e.target.value)}
                className="min-w-[100px] text-xs bg-muted/60 border-cyan-500/30"
                title="Filter by Card Number"
              >
                <option value="all">Select All (Card #)</option>
                {columnValues.cardNumber.map((num) => (
                  <option key={num} value={num}>{num}</option>
                ))}
              </Select>
              <Select
                value={filters.serialNumber || 'all'}
                onChange={(e) => handleFilterChange('serialNumber', e.target.value)}
                className="min-w-[130px] text-xs bg-muted/60 border-cyan-500/30"
                title="Filter by Serial Number"
              >
                <option value="all">Select All (Serial)</option>
                {columnValues.serialNumber.map((sn) => (
                  <option key={sn} value={sn}>{sn}</option>
                ))}
              </Select>
              <Select
                value={filters.cardType || 'all'}
                onChange={(e) => handleFilterChange('cardType', e.target.value)}
                className="min-w-[120px] text-xs bg-muted/60 border-cyan-500/30"
                title="Filter by Card Type"
              >
                <option value="all">Select All (Card Type)</option>
                {columnValues.cardType.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </Select>
              <Select
                value={filters.cardState || 'all'}
                onChange={(e) => handleFilterChange('cardState', e.target.value)}
                className="min-w-[110px] text-xs bg-muted/60 border-cyan-500/30"
                title="Filter by Card State"
              >
                <option value="all">Select All (State)</option>
                {columnValues.cardState.map((state) => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </Select>
              <Select
                value={filters.numberOfPorts || 'all'}
                onChange={(e) => handleFilterChange('numberOfPorts', e.target.value)}
                className="min-w-[100px] text-xs bg-muted/60 border-cyan-500/30"
                title="Filter by Number of Ports"
              >
                <option value="all">Select All (Ports)</option>
                {columnValues.numberOfPorts.map((ports) => (
                  <option key={ports} value={ports}>{ports}</option>
                ))}
              </Select>
              <Select
                value={filters.tags || 'all'}
                onChange={(e) => handleFilterChange('tags', e.target.value)}
                className="min-w-[120px] text-xs bg-muted/60 border-cyan-500/30"
                title="Filter by Tags"
              >
                <option value="all">Select All (Tags)</option>
                {columnValues.tags.map((tag) => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </Select>
            </div>
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
                      <TableCell>{card.cardNumber ?? 'N/A'}</TableCell>
                      <TableCell>{card.serialNumber}</TableCell>
                      <TableCell>{card.cardType}</TableCell>
                      <TableCell>
                        <StatusBadge status={card.cardState} />
                      </TableCell>
                      <TableCell>{card.numberOfPorts ?? 'N/A'}</TableCell>
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
