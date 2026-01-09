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
import { exportToCSV } from '@/lib/utils'

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
        <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-teal-400 bg-clip-text text-transparent">Sensor Information</h1>
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
                value={filters.sensorType || 'all'}
                onChange={(e) => handleFilterChange('sensorType', e.target.value)}
                className="min-w-[120px] text-xs bg-muted/60 border-cyan-500/30"
                title="Filter by Sensor Type"
              >
                <option value="all">Select All (Sensor Type)</option>
                {columnValues.sensorType.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </Select>
              <Select
                value={filters.sensorName || 'all'}
                onChange={(e) => handleFilterChange('sensorName', e.target.value)}
                className="min-w-[140px] text-xs bg-muted/60 border-cyan-500/30"
                title="Filter by Sensor Name"
              >
                <option value="all">Select All (Name)</option>
                {columnValues.sensorName.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </Select>
              <Select
                value={filters.sensorValue || 'all'}
                onChange={(e) => handleFilterChange('sensorValue', e.target.value)}
                className="min-w-[120px] text-xs bg-muted/60 border-cyan-500/30"
                title="Filter by Sensor Value"
              >
                <option value="all">Select All (Value)</option>
                {columnValues.sensorValue.map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </Select>
              <Select
                value={filters.unit || 'all'}
                onChange={(e) => handleFilterChange('unit', e.target.value)}
                className="min-w-[100px] text-xs bg-muted/60 border-cyan-500/30"
                title="Filter by Unit"
              >
                <option value="all">Select All (Unit)</option>
                {columnValues.unit.map((unit) => (
                  <option key={unit} value={unit}>{unit}</option>
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
