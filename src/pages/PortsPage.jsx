import { useState, useMemo } from 'react'
import { useApi, useMutation } from '@/hooks/use-api'
import { getPorts, pollPorts, releasePortOwnership } from '@/lib/api/endpoints'
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { RefreshCw, Search, Download, ArrowUpDown, ArrowUp, ArrowDown, X, Unlock } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { exportToCSV, getLastPolledTime } from '@/lib/utils'
import { StatusBadge } from '@/components/ui/status-badge'

function mbpsToGbps(speed) {
  if (speed === null || speed === undefined || speed === 'NA' || speed === 'N/A' || speed === '') return 'N/A'
  const mbps = parseFloat(speed)
  if (isNaN(mbps)) return speed
  const gbps = mbps / 1000
  return `${gbps % 1 === 0 ? gbps.toFixed(0) : gbps} Gbps`
}

function PortsPage() {
  const { data, loading, error, refetch } = useApi(getPorts)
  const { mutate: pollMutate } = useMutation(pollPorts)
  const { mutate: releaseMutate, loading: releaseLoading } = useMutation(releasePortOwnership)
  const { toast } = useToast()

  const [releasePort, setReleasePort] = useState(null)
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
    transceiverManufacturer: '',
    ixNetworkSession: ''
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
      transceiverManufacturer: new Set(),
      ixNetworkSession: new Set()
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
      if (port.ixNetworkSession && port.ixNetworkSession !== 'NA') values.ixNetworkSession.add(port.ixNetworkSession)
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
            case 'ixNetworkSession':
              return port.ixNetworkSession === filterValue
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
      transceiverManufacturer: '',
      ixNetworkSession: ''
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
      { key: 'speed', label: 'Speed (Gbps)' },
      { key: 'type', label: 'Type' },
      { key: 'transceiverModel', label: 'Transceiver Model' },
      { key: 'transceiverManufacturer', label: 'Transceiver Manufacturer' },
      { key: 'ixNetworkSession', label: 'IxNetwork Session' },
    ]

    const exportData = sortedPorts.map(port => ({
      chassisIp: port.chassisIp,
      typeOfChassis: port.typeOfChassis,
      cardNumber: port.cardNumber ?? 'N/A',
      portNumber: port.portNumber ?? 'N/A',
      linkState: port.linkState,
      owner: port.owner,
      speed: mbpsToGbps(port.speed),
      type: port.type,
      transceiverModel: port.transceiverModel,
      transceiverManufacturer: port.transceiverManufacturer,
      ixNetworkSession: port.ixNetworkSession,
    }))

    exportToCSV(exportData, headers, `ports_export_${new Date().toISOString().split('T')[0]}.csv`)
    toast({
      title: 'Success',
      description: 'Port data exported successfully',
    })
  }

  const handleReleaseConfirm = () => {
    releaseMutate(
      {
        chassisIp: releasePort.chassisIp,
        cardNumber: releasePort.cardNumber,
        portNumber: releasePort.portNumber,
      },
      {
        onSuccess: () => {
          toast({ title: 'Released', description: `Port ${releasePort.cardNumber}/${releasePort.portNumber} on ${releasePort.chassisIp} released.` })
          setReleasePort(null)
          refetch()
        },
        onError: (err) => {
          toast({ variant: 'destructive', title: 'Error', description: err.response?.data?.detail || 'Failed to release port ownership.' })
          setReleasePort(null)
        },
      }
    )
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
        <div>
          <h1 className="page-title">Port Details</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Last Polled at: <span className="font-mono" style={{color:"var(--cyan)"}}>{getLastPolledTime(portsList)}</span>
          </p>
        </div>
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
            <div className="flex gap-3 pt-3 border-t border-border/40 overflow-x-auto pb-2" style={{ borderColor: 'var(--border-k)' }}>
              {[
                { key: 'chassisIp',              label: 'IP Address',   values: columnValues.chassisIp,              render: v => v },
                { key: 'typeOfChassis',          label: 'Chassis Type', values: columnValues.typeOfChassis,          render: v => v },
                { key: 'cardNumber',             label: 'Card #',       values: columnValues.cardNumber,             render: v => v },
                { key: 'portNumber',             label: 'Port #',       values: columnValues.portNumber,             render: v => v },
                { key: 'linkState',              label: 'Link State',   values: columnValues.linkState,              render: v => v },
                { key: 'owner',                  label: 'Owner',        values: columnValues.owner,                  render: v => v },
                { key: 'speed',                  label: 'Speed',        values: columnValues.speed,                  render: v => mbpsToGbps(v) },
                { key: 'type',                   label: 'Port Type',    values: columnValues.type,                   render: v => v },
                { key: 'transceiverModel',       label: 'Xcvr Model',   values: columnValues.transceiverModel,       render: v => v },
                { key: 'transceiverManufacturer',label: 'Xcvr Mfr',    values: columnValues.transceiverManufacturer,render: v => v },
                { key: 'ixNetworkSession',       label: 'IxNet Session',values: columnValues.ixNetworkSession,       render: v => v },
              ].map(({ key, label, values, render }) => {
                const active = !!filters[key]
                return (
                  <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '3px', flexShrink: 0 }}>
                    <span style={{
                      fontSize: '0.60rem', fontFamily: 'var(--font-mono)', fontWeight: 700,
                      letterSpacing: '0.12em', textTransform: 'uppercase',
                      color: active ? 'var(--cyan)' : 'var(--text-dim)',
                      transition: 'color 150ms ease',
                    }}>
                      {label}{active ? ' ●' : ''}
                    </span>
                    <Select value={filters[key] || 'all'} onChange={(e) => handleFilterChange(key, e.target.value)}
                      style={{ minWidth: '110px', padding: '4px 8px', fontSize: '0.72rem' }}>
                      <option value="all">All</option>
                      {values.map((v) => <option key={v} value={v}>{render(v)}</option>)}
                    </Select>
                  </div>
                )
              })}
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
                    Speed (Gbps){getSortIcon('speed')}
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
                  <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('ixNetworkSession')}>
                    IxNetwork Session{getSortIcon('ixNetworkSession')}
                  </TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedPorts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center text-muted-foreground">
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
                      <TableCell>{mbpsToGbps(port.speed)}</TableCell>
                      <TableCell>{port.type}</TableCell>
                      <TableCell>{port.transceiverModel}</TableCell>
                      <TableCell>{port.transceiverManufacturer}</TableCell>
                      <TableCell>{port.ixNetworkSession}</TableCell>
                      <TableCell>
                        {port.owner && port.owner !== 'Free' && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setReleasePort(port)}
                          >
                            <Unlock className="h-3 w-3 mr-1" />
                            Release
                          </Button>
                        )}
                      </TableCell>
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
      <Dialog open={!!releasePort} onOpenChange={(open) => { if (!open) setReleasePort(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Release Port Ownership</DialogTitle>
            <DialogDescription>
              Release ownership of port <strong>{releasePort?.cardNumber}/{releasePort?.portNumber}</strong> on{' '}
              <strong>{releasePort?.chassisIp}</strong>?
              <br /><br />
              Currently owned by: <strong>{releasePort?.owner}</strong>. Active tests on this port will be interrupted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReleasePort(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReleaseConfirm} disabled={releaseLoading}>
              {releaseLoading ? 'Releasing...' : 'Release Ownership'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default PortsPage
