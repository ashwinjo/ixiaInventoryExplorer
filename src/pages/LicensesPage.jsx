import { useState, useMemo } from 'react'
import { useApi, useMutation } from '@/hooks/use-api'
import { getLicenses, pollLicenses } from '@/lib/api/endpoints'
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

function LicensesPage() {
  const { data, loading, error, refetch } = useApi(getLicenses)
  const { mutate: pollMutate } = useMutation(pollLicenses)
  const { toast } = useToast()
  
  const [searchTerm, setSearchTerm] = useState('')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [sortColumn, setSortColumn] = useState(null)
  const [sortDirection, setSortDirection] = useState('asc')

  const licensesList = data?.licenses || []

  const filteredLicenses = useMemo(() => {
    if (!searchTerm) return licensesList
    
    const term = searchTerm.toLowerCase()
    return licensesList.filter((license) => {
      return (
        license.chassisIp?.toLowerCase().includes(term) ||
        license.partNumber?.toLowerCase().includes(term) ||
        license.description?.toLowerCase().includes(term) ||
        license.hostId?.toLowerCase().includes(term)
      )
    })
  }, [licensesList, searchTerm])

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
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by IP, Part Number, Description, Host ID..."
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
                        {(() => {
                          const status = license.isExpired === 'True' || license.isExpired === true ? 'Expired' : 'Active'
                          const isActive = status === 'Active'
                          return (
                            <span
                              className={`px-2 py-1 rounded text-xs ${
                                isActive
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {status}
                            </span>
                          )
                        })()}
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
