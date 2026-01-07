import { useState, useMemo } from 'react'
import { useApi, useMutation } from '@/hooks/use-api'
import { getPorts, pollPorts } from '@/lib/api/endpoints'
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
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { RefreshCw, Search, Download, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { exportToCSV } from '@/lib/utils'

function PortsPage() {
  const { data, loading, error, refetch } = useApi(getPorts)
  const { mutate: pollMutate } = useMutation(pollPorts)
  const { toast } = useToast()
  
  const [searchTerm, setSearchTerm] = useState('')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [sortColumn, setSortColumn] = useState(null)
  const [sortDirection, setSortDirection] = useState('asc')

  const portsList = data?.ports || []

  const filteredPorts = useMemo(() => {
    if (!searchTerm) return portsList
    
    const term = searchTerm.toLowerCase()
    return portsList.filter((port) => {
      return (
        port.chassisIp?.toLowerCase().includes(term) ||
        port.owner?.toLowerCase().includes(term) ||
        port.linkState?.toLowerCase().includes(term) ||
        port.transceiverModel?.toLowerCase().includes(term)
      )
    })
  }, [portsList, searchTerm])

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
      cardNumber: port.cardNumber,
      portNumber: port.portNumber,
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
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by IP, Owner, Link State, Transceiver..."
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
                      <TableCell>{port.cardNumber}</TableCell>
                      <TableCell>{port.portNumber}</TableCell>
                      <TableCell>
                        {(() => {
                          const linkState = port.linkState?.toUpperCase() || ''
                          let colorClass = ''
                          
                          if (linkState === 'UP') {
                            colorClass = 'bg-green-100 text-green-800'
                          } else if (linkState === 'DOWN') {
                            colorClass = 'bg-red-100 text-red-800'
                          } else {
                            // Use different colors based on the link state string
                            // Orange for states like "UNKNOWN", "DISABLED", "UNPLUGGED"
                            // Yellow for states like "INIT", "CONFIGURING", "TESTING"
                            // Pink for other states
                            const stateLower = port.linkState?.toLowerCase() || ''
                            if (stateLower.includes('unknown') || stateLower.includes('disabled') || stateLower.includes('unplugged')) {
                              colorClass = 'bg-orange-100 text-orange-800'
                            } else if (stateLower.includes('init') || stateLower.includes('configuring') || stateLower.includes('testing')) {
                              colorClass = 'bg-yellow-100 text-yellow-800'
                            } else {
                              colorClass = 'bg-pink-100 text-pink-800'
                            }
                          }
                          
                          return (
                            <span className={`px-2 py-1 rounded text-xs ${colorClass}`}>
                              {port.linkState}
                            </span>
                          )
                        })()}
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
