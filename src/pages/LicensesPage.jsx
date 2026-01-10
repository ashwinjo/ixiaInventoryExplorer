import { useState, useMemo } from 'react'
import { useApi, useMutation } from '@/hooks/use-api'
import { getLicenses, pollLicenses } from '@/lib/api/endpoints'
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

function LicensesPage() {
  const { data, loading, error, refetch } = useApi(getLicenses)
  const { mutate: pollMutate } = useMutation(pollLicenses)
  const { toast } = useToast()
  
  const [searchTerm, setSearchTerm] = useState('')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [sortColumn, setSortColumn] = useState(null)
  const [sortDirection, setSortDirection] = useState('asc')
  
  // Column-based filters
  const [filters, setFilters] = useState({
    chassisIp: '',
    typeOfChassis: '',
    hostId: '',
    partNumber: '',
    activationCode: '',
    quantity: '',
    description: '',
    maintenanceDate: '',
    expiryDate: '',
    status: ''
  })

  const licensesList = data?.licenses || []

  // Get unique values for each column
  const columnValues = useMemo(() => {
    const values = {
      chassisIp: new Set(),
      typeOfChassis: new Set(),
      hostId: new Set(),
      partNumber: new Set(),
      activationCode: new Set(),
      quantity: new Set(),
      description: new Set(),
      maintenanceDate: new Set(),
      expiryDate: new Set(),
      status: new Set()
    }

    licensesList.forEach((license) => {
      if (license.chassisIp) values.chassisIp.add(license.chassisIp)
      if (license.typeOfChassis && license.typeOfChassis !== 'NA') values.typeOfChassis.add(license.typeOfChassis)
      if (license.hostId && license.hostId !== 'NA') values.hostId.add(license.hostId)
      if (license.partNumber && license.partNumber !== 'NA') values.partNumber.add(license.partNumber)
      if (license.activationCode && license.activationCode !== 'NA') values.activationCode.add(license.activationCode)
      if (license.quantity !== undefined && license.quantity !== 'NA') values.quantity.add(license.quantity.toString())
      if (license.description && license.description !== 'NA') values.description.add(license.description)
      if (license.maintenanceDate && license.maintenanceDate !== 'NA') values.maintenanceDate.add(license.maintenanceDate)
      if (license.expiryDate && license.expiryDate !== 'NA') values.expiryDate.add(license.expiryDate)
      const status = license.isExpired === 'True' || license.isExpired === true ? 'Expired' : 'Active'
      values.status.add(status)
    })

    return Object.fromEntries(
      Object.entries(values).map(([key, set]) => [key, Array.from(set).sort()])
    )
  }, [licensesList])

  // Filter licenses based on column filters and search term
  const filteredLicenses = useMemo(() => {
    let filtered = licensesList

    // Apply column-based filters (AND logic)
    Object.entries(filters).forEach(([column, filterValue]) => {
      if (filterValue && filterValue !== '') {
        filtered = filtered.filter((license) => {
          switch (column) {
            case 'chassisIp':
              return license.chassisIp === filterValue
            case 'typeOfChassis':
              return license.typeOfChassis === filterValue
            case 'hostId':
              return license.hostId === filterValue
            case 'partNumber':
              return license.partNumber === filterValue
            case 'activationCode':
              return license.activationCode === filterValue
            case 'quantity':
              return license.quantity?.toString() === filterValue
            case 'description':
              return license.description === filterValue
            case 'maintenanceDate':
              return license.maintenanceDate === filterValue
            case 'expiryDate':
              return license.expiryDate === filterValue
            case 'status':
              const status = license.isExpired === 'True' || license.isExpired === true ? 'Expired' : 'Active'
              return status === filterValue
            default:
              return true
          }
        })
      }
    })

    // Apply search term filter
    if (searchTerm) {
    const term = searchTerm.toLowerCase()
      filtered = filtered.filter((license) => {
      return (
        license.chassisIp?.toLowerCase().includes(term) ||
        license.partNumber?.toLowerCase().includes(term) ||
        license.description?.toLowerCase().includes(term) ||
        license.hostId?.toLowerCase().includes(term)
      )
    })
    }

    return filtered
  }, [licensesList, filters, searchTerm])

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
      hostId: '',
      partNumber: '',
      activationCode: '',
      quantity: '',
      description: '',
      maintenanceDate: '',
      expiryDate: '',
      status: ''
    })
    setSearchTerm('')
  }

  const sortedLicenses = useMemo(() => {
    if (!sortColumn) return filteredLicenses
    
    return [...filteredLicenses].sort((a, b) => {
      let aValue = a[sortColumn] ?? ''
      let bValue = b[sortColumn] ?? ''
      
      // Handle isExpired field for status sorting
      if (sortColumn === 'status') {
        aValue = a.isExpired === 'True' || a.isExpired === true ? 'Expired' : 'Active'
        bValue = b.isExpired === 'True' || b.isExpired === true ? 'Expired' : 'Active'
      }
      
      const aStr = String(aValue).toLowerCase()
      const bStr = String(bValue).toLowerCase()
      
      if (aStr < bStr) return sortDirection === 'asc' ? -1 : 1
      if (aStr > bStr) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
  }, [filteredLicenses, sortColumn, sortDirection])

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
              description: 'License data refreshed successfully',
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
    if (sortedLicenses.length === 0) {
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
      { key: 'hostId', label: 'Host ID' },
      { key: 'partNumber', label: 'Part Number' },
      { key: 'activationCode', label: 'Activation Code' },
      { key: 'quantity', label: 'Quantity' },
      { key: 'description', label: 'Description' },
      { key: 'maintenanceDate', label: 'Maintenance Date' },
      { key: 'expiryDate', label: 'Expiry Date' },
      { key: 'status', label: 'Status' },
    ]

    const exportData = sortedLicenses.map(license => ({
      chassisIp: license.chassisIp,
      typeOfChassis: license.typeOfChassis,
      hostId: license.hostId,
      partNumber: license.partNumber,
      activationCode: license.activationCode,
      quantity: license.quantity,
      description: license.description,
      maintenanceDate: license.maintenanceDate,
      expiryDate: license.expiryDate,
      status: license.isExpired === 'True' || license.isExpired === true ? 'Expired' : 'Active',
    }))

    exportToCSV(exportData, headers, `licenses_export_${new Date().toISOString().split('T')[0]}.csv`)
    toast({
      title: 'Success',
      description: 'License data exported successfully',
    })
  }

  if (loading && !licensesList.length) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading license data...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-destructive">Error loading license data: {error}</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-teal-400 bg-clip-text text-transparent">License Details</h1>
        <div className="flex gap-2">
          <Button
            onClick={handleExport}
            variant="outline"
            disabled={sortedLicenses.length === 0}
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
              placeholder="Search by IP, Part Number, Description, Host ID..."
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
                value={filters.hostId || 'all'}
                onChange={(e) => handleFilterChange('hostId', e.target.value)}
                className="min-w-[140px] text-xs bg-muted/60 border-cyan-500/30"
                title="Filter by Host ID"
              >
                <option value="all">Select All (Host ID)</option>
                {columnValues.hostId.map((hostId) => (
                  <option key={hostId} value={hostId}>{hostId}</option>
                ))}
              </Select>
              <Select
                value={filters.partNumber || 'all'}
                onChange={(e) => handleFilterChange('partNumber', e.target.value)}
                className="min-w-[140px] text-xs bg-muted/60 border-cyan-500/30"
                title="Filter by Part Number"
              >
                <option value="all">Select All (Part #)</option>
                {columnValues.partNumber.map((part) => (
                  <option key={part} value={part}>{part}</option>
                ))}
              </Select>
              <Select
                value={filters.activationCode || 'all'}
                onChange={(e) => handleFilterChange('activationCode', e.target.value)}
                className="min-w-[140px] text-xs bg-muted/60 border-cyan-500/30"
                title="Filter by Activation Code"
              >
                <option value="all">Select All (Code)</option>
                {columnValues.activationCode.map((code) => (
                  <option key={code} value={code}>{code}</option>
                ))}
              </Select>
              <Select
                value={filters.quantity || 'all'}
                onChange={(e) => handleFilterChange('quantity', e.target.value)}
                className="min-w-[100px] text-xs bg-muted/60 border-cyan-500/30"
                title="Filter by Quantity"
              >
                <option value="all">Select All (Qty)</option>
                {columnValues.quantity.map((qty) => (
                  <option key={qty} value={qty}>{qty}</option>
                ))}
              </Select>
              <Select
                value={filters.description || 'all'}
                onChange={(e) => handleFilterChange('description', e.target.value)}
                className="min-w-[150px] text-xs bg-muted/60 border-cyan-500/30"
                title="Filter by Description"
              >
                <option value="all">Select All (Desc)</option>
                {columnValues.description.map((desc) => (
                  <option key={desc} value={desc}>{desc}</option>
                ))}
              </Select>
              <Select
                value={filters.maintenanceDate || 'all'}
                onChange={(e) => handleFilterChange('maintenanceDate', e.target.value)}
                className="min-w-[140px] text-xs bg-muted/60 border-cyan-500/30"
                title="Filter by Maintenance Date"
              >
                <option value="all">Select All (Maint)</option>
                {columnValues.maintenanceDate.map((date) => (
                  <option key={date} value={date}>{date}</option>
                ))}
              </Select>
              <Select
                value={filters.expiryDate || 'all'}
                onChange={(e) => handleFilterChange('expiryDate', e.target.value)}
                className="min-w-[140px] text-xs bg-muted/60 border-cyan-500/30"
                title="Filter by Expiry Date"
              >
                <option value="all">Select All (Expiry)</option>
                {columnValues.expiryDate.map((date) => (
                  <option key={date} value={date}>{date}</option>
                ))}
              </Select>
              <Select
                value={filters.status || 'all'}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="min-w-[110px] text-xs bg-muted/60 border-cyan-500/30"
                title="Filter by Status"
              >
                <option value="all">Select All (Status)</option>
                {columnValues.status.map((status) => (
                  <option key={status} value={status}>{status}</option>
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
                  <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('hostId')}>
                    Host ID{getSortIcon('hostId')}
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('partNumber')}>
                    Part Number{getSortIcon('partNumber')}
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('activationCode')}>
                    Activation Code{getSortIcon('activationCode')}
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('quantity')}>
                    Quantity{getSortIcon('quantity')}
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('description')}>
                    Description{getSortIcon('description')}
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('maintenanceDate')}>
                    Maintenance Date{getSortIcon('maintenanceDate')}
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('expiryDate')}>
                    Expiry Date{getSortIcon('expiryDate')}
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('status')}>
                    Status{getSortIcon('status')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedLicenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground">
                      No licenses found
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedLicenses.map((license, idx) => (
                    <TableRow key={`${license.chassisIp}-${license.partNumber}-${idx}`}>
                      <TableCell className="font-medium">{license.chassisIp}</TableCell>
                      <TableCell>{license.typeOfChassis}</TableCell>
                      <TableCell>{license.hostId}</TableCell>
                      <TableCell>{license.partNumber}</TableCell>
                      <TableCell className="font-mono text-xs">{license.activationCode}</TableCell>
                      <TableCell>{license.quantity}</TableCell>
                      <TableCell>{license.description}</TableCell>
                      <TableCell>{license.maintenanceDate}</TableCell>
                      <TableCell>{license.expiryDate}</TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            license.isExpired === 'True' || license.isExpired === true
                              ? 'bg-red-100 text-red-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {license.isExpired === 'True' || license.isExpired === true ? 'Expired' : 'Active'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="mt-4 text-sm text-muted-foreground">
            Showing {sortedLicenses.length} of {licensesList.length} licenses
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default LicensesPage
