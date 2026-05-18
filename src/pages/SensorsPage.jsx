import { useState, useMemo } from 'react'
import { useApi, useMutation } from '@/hooks/use-api'
import { getSensors, pollSensors } from '@/lib/api/endpoints'
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
import { exportToCSV, getLastPolledTime } from '@/lib/utils'

function SensorsPage() {
  const { data, loading, error, refetch } = useApi(getSensors)
  const { mutate: pollMutate } = useMutation(pollSensors)
  const { toast } = useToast()
  
  const [searchTerm, setSearchTerm] = useState('')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [sortColumn, setSortColumn] = useState(null)
  const [sortDirection, setSortDirection] = useState('asc')
  
  // Column-based filters
  const [filters, setFilters] = useState({
    chassisIp: '',
    typeOfChassis: '',
    sensorType: '',
    sensorName: '',
    sensorValue: '',
    unit: ''
  })

  const sensorsList = data?.sensors || []

  // Get unique values for each column
  const columnValues = useMemo(() => {
    const values = {
      chassisIp: new Set(),
      typeOfChassis: new Set(),
      sensorType: new Set(),
      sensorName: new Set(),
      sensorValue: new Set(),
      unit: new Set()
    }

    sensorsList.forEach((sensor) => {
      if (sensor.chassisIp) values.chassisIp.add(sensor.chassisIp)
      if (sensor.typeOfChassis && sensor.typeOfChassis !== 'NA') values.typeOfChassis.add(sensor.typeOfChassis)
      if (sensor.sensorType && sensor.sensorType !== 'NA') values.sensorType.add(sensor.sensorType)
      if (sensor.sensorName && sensor.sensorName !== 'NA') values.sensorName.add(sensor.sensorName)
      if (sensor.sensorValue !== undefined && sensor.sensorValue !== 'NA') values.sensorValue.add(sensor.sensorValue.toString())
      if (sensor.unit && sensor.unit !== 'NA') values.unit.add(sensor.unit)
    })

    return Object.fromEntries(
      Object.entries(values).map(([key, set]) => [key, Array.from(set).sort()])
    )
  }, [sensorsList])

  // Filter sensors based on column filters and search term
  const filteredSensors = useMemo(() => {
    let filtered = sensorsList

    // Apply column-based filters (AND logic)
    Object.entries(filters).forEach(([column, filterValue]) => {
      if (filterValue && filterValue !== '') {
        filtered = filtered.filter((sensor) => {
          switch (column) {
            case 'chassisIp':
              return sensor.chassisIp === filterValue
            case 'typeOfChassis':
              return sensor.typeOfChassis === filterValue
            case 'sensorType':
              return sensor.sensorType === filterValue
            case 'sensorName':
              return sensor.sensorName === filterValue
            case 'sensorValue':
              return sensor.sensorValue?.toString() === filterValue
            case 'unit':
              return sensor.unit === filterValue
            default:
              return true
          }
        })
      }
    })

    // Apply search term filter
    if (searchTerm) {
    const term = searchTerm.toLowerCase()
      filtered = filtered.filter((sensor) => {
      return (
        sensor.chassisIp?.toLowerCase().includes(term) ||
        sensor.sensorName?.toLowerCase().includes(term) ||
        sensor.sensorType?.toLowerCase().includes(term)
      )
    })
    }

    return filtered
  }, [sensorsList, filters, searchTerm])

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
      sensorType: '',
      sensorName: '',
      sensorValue: '',
      unit: ''
    })
    setSearchTerm('')
  }

  const sortedSensors = useMemo(() => {
    if (!sortColumn) return filteredSensors
    
    return [...filteredSensors].sort((a, b) => {
      let aValue = a[sortColumn] ?? ''
      let bValue = b[sortColumn] ?? ''
      
      const aStr = String(aValue).toLowerCase()
      const bStr = String(bValue).toLowerCase()
      
      if (aStr < bStr) return sortDirection === 'asc' ? -1 : 1
      if (aStr > bStr) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
  }, [filteredSensors, sortColumn, sortDirection])

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
              description: 'Sensor data refreshed successfully',
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
    if (sortedSensors.length === 0) {
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
      { key: 'sensorType', label: 'Sensor Type' },
      { key: 'sensorName', label: 'Sensor Name' },
      { key: 'sensorValue', label: 'Sensor Value' },
      { key: 'unit', label: 'Unit' },
      { key: 'lastUpdatedAt_UTC', label: 'Last Updated' },
    ]

    const exportData = sortedSensors.map(sensor => ({
      chassisIp: sensor.chassisIp,
      typeOfChassis: sensor.typeOfChassis,
      sensorType: sensor.sensorType,
      sensorName: sensor.sensorName,
      sensorValue: sensor.sensorValue,
      unit: sensor.unit,
      lastUpdatedAt_UTC: sensor.lastUpdatedAt_UTC,
    }))

    exportToCSV(exportData, headers, `sensors_export_${new Date().toISOString().split('T')[0]}.csv`)
    toast({
      title: 'Success',
      description: 'Sensor data exported successfully',
    })
  }

  if (loading && !sensorsList.length) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading sensor data...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-destructive">Error loading sensor data: {error}</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Sensor Information</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Last Polled at: <span className="font-mono" style={{color:"var(--cyan)"}}>{getLastPolledTime(sensorsList)}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleExport}
            variant="outline"
            disabled={sortedSensors.length === 0}
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
              placeholder="Search by IP, Sensor Name, Sensor Type..."
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
                { key: 'chassisIp',    label: 'IP Address',   values: columnValues.chassisIp,    render: v => v },
                { key: 'typeOfChassis',label: 'Chassis Type', values: columnValues.typeOfChassis,render: v => v },
                { key: 'sensorType',   label: 'Sensor Type',  values: columnValues.sensorType,   render: v => v },
                { key: 'sensorName',   label: 'Sensor Name',  values: columnValues.sensorName,   render: v => v },
                { key: 'sensorValue',  label: 'Value',        values: columnValues.sensorValue,  render: v => v },
                { key: 'unit',         label: 'Unit',         values: columnValues.unit,         render: v => v },
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
                  <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('sensorType')}>
                    Sensor Type{getSortIcon('sensorType')}
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('sensorName')}>
                    Sensor Name{getSortIcon('sensorName')}
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('sensorValue')}>
                    Sensor Value{getSortIcon('sensorValue')}
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('unit')}>
                    Unit{getSortIcon('unit')}
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('lastUpdatedAt_UTC')}>
                    Last Updated{getSortIcon('lastUpdatedAt_UTC')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedSensors.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No sensors found
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedSensors.map((sensor, idx) => (
                    <TableRow key={`${sensor.chassisIp}-${sensor.sensorName}-${idx}`}>
                      <TableCell className="font-medium">{sensor.chassisIp}</TableCell>
                      <TableCell>{sensor.typeOfChassis}</TableCell>
                      <TableCell>{sensor.sensorType}</TableCell>
                      <TableCell>{sensor.sensorName}</TableCell>
                      <TableCell className="font-medium">{sensor.sensorValue}</TableCell>
                      <TableCell>{sensor.unit}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {sensor.lastUpdatedAt_UTC}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="mt-4 text-sm text-muted-foreground">
            Showing {sortedSensors.length} of {sensorsList.length} sensors
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default SensorsPage
