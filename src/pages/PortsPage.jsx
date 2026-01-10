import { useState, useMemo } from 'react'
import { useApi, useMutation } from '@/hooks/use-api'
import { getPorts, pollPorts } from '@/lib/api/endpoints'
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
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { RefreshCw, Search, Download, ArrowUpDown, ArrowUp, ArrowDown, X } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { exportToCSV } from '@/lib/utils'
import { StatusBadge } from '@/components/ui/status-badge'

function PortsPage() {
  const { data, loading, error, refetch } = useApi(getPorts)
  const { mutate: pollMutate } = useMutation(pollPorts)
  const { toast } = useToast()
  
  const [searchTerm, setSearchTerm] = useState('')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [sortColumn, setSortColumn] = useState(null)
  const [sortDirection, setSortDirection] = useState('asc')
  
  // Column-based filters
  const [filters, setFilters] = useState({
    chassisIp: '',
    typeOfChassis: '',
    cardNumber: '',
    portNumber: '',
    linkState: '',
    owner: '',
    speed: '',
    type: '',
    transceiverModel: '',
    transceiverManufacturer: ''
  })

  const portsList = data?.ports || []

  // Get unique values for each column
  const columnValues = useMemo(() => {
    const values = {
      chassisIp: new Set(),
      typeOfChassis: new Set(),
      cardNumber: new Set(),
      portNumber: new Set(),
      linkState: new Set(),
      owner: new Set(),
      speed: new Set(),
      type: new Set(),
      transceiverModel: new Set(),
      transceiverManufacturer: new Set()
    }

    portsList.forEach((port) => {
      if (port.chassisIp) values.chassisIp.add(port.chassisIp)
      if (port.typeOfChassis && port.typeOfChassis !== 'NA') values.typeOfChassis.add(port.typeOfChassis)
      if (port.cardNumber !== undefined && port.cardNumber !== null && port.cardNumber !== 'NA') values.cardNumber.add(port.cardNumber.toString())
      if (port.portNumber !== undefined && port.portNumber !== null && port.portNumber !== 'NA') values.portNumber.add(port.portNumber.toString())
      if (port.linkState && port.linkState !== 'NA') values.linkState.add(port.linkState)
      if (port.owner && port.owner !== 'NA') values.owner.add(port.owner)
      if (port.speed && port.speed !== 'NA') values.speed.add(port.speed)
      if (port.type && port.type !== 'NA') values.type.add(port.type)
      if (port.transceiverModel && port.transceiverModel !== 'NA') values.transceiverModel.add(port.transceiverModel)
      if (port.transceiverManufacturer && port.transceiverManufacturer !== 'NA') values.transceiverManufacturer.add(port.transceiverManufacturer)
    })

    return Object.fromEntries(
      Object.entries(values).map(([key, set]) => [key, Array.from(set).sort()])
    )
  }, [portsList])

  // Filter ports based on column filters and search term
  const filteredPorts = useMemo(() => {
    let filtered = portsList

    // Apply column-based filters (AND logic)
    Object.entries(filters).forEach(([column, filterValue]) => {
      if (filterValue && filterValue !== '') {
        filtered = filtered.filter((port) => {
          switch (column) {
            case 'chassisIp':
              return port.chassisIp === filterValue
            case 'typeOfChassis':
              return port.typeOfChassis === filterValue
            case 'cardNumber':
              return port.cardNumber !== null && port.cardNumber !== undefined && port.cardNumber?.toString() === filterValue
            case 'portNumber':
              return port.portNumber !== null && port.portNumber !== undefined && port.portNumber?.toString() === filterValue
            case 'linkState':
              return port.linkState === filterValue
            case 'owner':
              return port.owner === filterValue
            case 'speed':
              return port.speed === filterValue
            case 'type':
              return port.type === filterValue
            case 'transceiverModel':
              return port.transceiverModel === filterValue
            case 'transceiverManufacturer':
              return port.transceiverManufacturer === filterValue
            default:
              return true
          }
        })
      }
    })

    // Apply search term filter
    if (searchTerm) {
    const term = searchTerm.toLowerCase()
      filtered = filtered.filter((port) => {
      return (
        port.chassisIp?.toLowerCase().includes(term) ||
        port.owner?.toLowerCase().includes(term) ||
        port.linkState?.toLowerCase().includes(term) ||
        port.transceiverModel?.toLowerCase().includes(term)
      )
    })
    }

    return filtered
  }, [portsList, filters, searchTerm])

  const handleFilterChange = (column, value) => {
    setFilters(prev => ({
      ...prev,
      [column]: value === 'all' ? '' : value
    }))
  }

  const clearAllFilters = () => {
    setFilters({
      chassisIp: '',
      typeOfChassis: '',
      cardNumber: '',
      portNumber: '',
      linkState: '',
      owner: '',
      speed: '',
      type: '',
      transceiverModel: '',
      transceiverManufacturer: ''
    })
    setSearchTerm('')
  }

  const sortedPorts = useMemo(() => {
    if (!sortColumn) return filteredPorts
    
    return [...filteredPorts].sort((a, b) => {
      let aValue = a[sortColumn] ?? ''
      let bValue = b[sortColumn] ?? ''
      
      const aStr = String(aValue).toLowerCase()
      const bStr = String(bValue).toLowerCase()
      
      if (aStr < bStr) return sortDirection === 'asc' ? -1 : 1
      if (aStr > bStr) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
  }, [filteredPorts, sortColumn, sortDirection])

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
              description: 'Port data refreshed successfully',
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

  const handleExport = () => {
    if (sortedPorts.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No data to export',
      })
      return
    }

    const headers = [
      { key: 'chassisIp', label: 'Chassis IP' },
      { key: 'typeOfChassis', label: 'Chassis Type' },
      { key: 'cardNumber', label: 'Card Number' },
      { key: 'portNumber', label: 'Port Number' },
      { key: 'linkState', label: 'Link State' },
      { key: 'owner', label: 'Owner' },
      { key: 'speed', label: 'Speed' },
      { key: 'type', label: 'Type' },
      { key: 'transceiverModel', label: 'Transceiver Model' },
      { key: 'transceiverManufacturer', label: 'Transceiver Manufacturer' },
    ]

    const exportData = sortedPorts.map(port => ({
      chassisIp: port.chassisIp,
      typeOfChassis: port.typeOfChassis,
      cardNumber: port.cardNumber ?? 'N/A',
      portNumber: port.portNumber ?? 'N/A',
      linkState: port.linkState,
      owner: port.owner,
      speed: port.speed,
      type: port.type,
      transceiverModel: port.transceiverModel,
      transceiverManufacturer: port.transceiverManufacturer,
    }))

    exportToCSV(exportData, headers, `ports_export_${new Date().toISOString().split('T')[0]}.csv`)
    toast({
      title: 'Success',
      description: 'Port data exported successfully',
    })
  }

  if (loading && !portsList.length) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading port data...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-destructive">Error loading port data: {error}</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-teal-400 bg-clip-text text-transparent">Port Details</h1>
        <div className="flex gap-2">
          <Button
            onClick={handleExport}
            variant="outline"
            disabled={sortedPorts.length === 0}
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
              placeholder="Search by IP, Owner, Link State, Transceiver..."
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
                value={filters.typeOfChassis || 'all'}
                onChange={(e) => handleFilterChange('typeOfChassis', e.target.value)}
                className="min-w-[120px] text-xs bg-muted/60 border-cyan-500/30"
                title="Filter by Chassis Type"
              >
                <option value="all">Select All (Type)</option>
                {columnValues.typeOfChassis.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </Select>
              <Select
                value={filters.cardNumber || 'all'}
                onChange={(e) => handleFilterChange('cardNumber', e.target.value)}
                className="min-w-[100px] text-xs bg-muted/60 border-cyan-500/30"
                title="Filter by Card Number"
              >
                <option value="all">Select All (Card)</option>
                {columnValues.cardNumber.map((num) => (
                  <option key={num} value={num}>{num}</option>
                ))}
              </Select>
              <Select
                value={filters.portNumber || 'all'}
                onChange={(e) => handleFilterChange('portNumber', e.target.value)}
                className="min-w-[100px] text-xs bg-muted/60 border-cyan-500/30"
                title="Filter by Port Number"
              >
                <option value="all">Select All (Port)</option>
                {columnValues.portNumber.map((num) => (
                  <option key={num} value={num}>{num}</option>
                ))}
              </Select>
              <Select
                value={filters.linkState || 'all'}
                onChange={(e) => handleFilterChange('linkState', e.target.value)}
                className="min-w-[110px] text-xs bg-muted/60 border-cyan-500/30"
                title="Filter by Link State"
              >
                <option value="all">Select All (State)</option>
                {columnValues.linkState.map((state) => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </Select>
              <Select
                value={filters.owner || 'all'}
                onChange={(e) => handleFilterChange('owner', e.target.value)}
                className="min-w-[100px] text-xs bg-muted/60 border-cyan-500/30"
                title="Filter by Owner"
              >
                <option value="all">Select All (Owner)</option>
                {columnValues.owner.map((owner) => (
                  <option key={owner} value={owner}>{owner}</option>
                ))}
              </Select>
              <Select
                value={filters.speed || 'all'}
                onChange={(e) => handleFilterChange('speed', e.target.value)}
                className="min-w-[100px] text-xs bg-muted/60 border-cyan-500/30"
                title="Filter by Speed"
              >
                <option value="all">Select All (Speed)</option>
                {columnValues.speed.map((speed) => (
                  <option key={speed} value={speed}>{speed}</option>
                ))}
              </Select>
              <Select
                value={filters.type || 'all'}
                onChange={(e) => handleFilterChange('type', e.target.value)}
                className="min-w-[100px] text-xs bg-muted/60 border-cyan-500/30"
                title="Filter by Type"
              >
                <option value="all">Select All (Type)</option>
                {columnValues.type.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </Select>
              <Select
                value={filters.transceiverModel || 'all'}
                onChange={(e) => handleFilterChange('transceiverModel', e.target.value)}
                className="min-w-[140px] text-xs bg-muted/60 border-cyan-500/30"
                title="Filter by Transceiver Model"
              >
                <option value="all">Select All (Model)</option>
                {columnValues.transceiverModel.map((model) => (
                  <option key={model} value={model}>{model}</option>
                ))}
              </Select>
              <Select
                value={filters.transceiverManufacturer || 'all'}
                onChange={(e) => handleFilterChange('transceiverManufacturer', e.target.value)}
                className="min-w-[140px] text-xs bg-muted/60 border-cyan-500/30"
                title="Filter by Transceiver Manufacturer"
              >
                <option value="all">Select All (Mfr)</option>
                {columnValues.transceiverManufacturer.map((mfr) => (
                  <option key={mfr} value={mfr}>{mfr}</option>
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
                  <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('typeOfChassis')}>
                    Chassis Type{getSortIcon('typeOfChassis')}
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('cardNumber')}>
                    Card Number{getSortIcon('cardNumber')}
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('portNumber')}>
                    Port Number{getSortIcon('portNumber')}
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('linkState')}>
                    Link State{getSortIcon('linkState')}
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('owner')}>
                    Owner{getSortIcon('owner')}
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('speed')}>
                    Speed{getSortIcon('speed')}
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('type')}>
                    Type{getSortIcon('type')}
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('transceiverModel')}>
                    Transceiver Model{getSortIcon('transceiverModel')}
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('transceiverManufacturer')}>
                    Transceiver Manufacturer{getSortIcon('transceiverManufacturer')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedPorts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground">
                      No ports found
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedPorts.map((port, idx) => (
                    <TableRow key={`${port.chassisIp}-${port.cardNumber}-${port.portNumber}-${idx}`}>
                      <TableCell className="font-medium">{port.chassisIp}</TableCell>
                      <TableCell>{port.typeOfChassis}</TableCell>
                      <TableCell>{port.cardNumber ?? 'N/A'}</TableCell>
                      <TableCell>{port.portNumber ?? 'N/A'}</TableCell>
                      <TableCell>
                        <StatusBadge status={port.linkState} />
                      </TableCell>
                      <TableCell>{port.owner}</TableCell>
                      <TableCell>{port.speed}</TableCell>
                      <TableCell>{port.type}</TableCell>
                      <TableCell>{port.transceiverModel}</TableCell>
                      <TableCell>{port.transceiverManufacturer}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="mt-4 text-sm text-muted-foreground">
            Showing {sortedPorts.length} of {portsList.length} ports
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default PortsPage
