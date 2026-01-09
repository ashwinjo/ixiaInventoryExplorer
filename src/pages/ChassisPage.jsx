import { useState, useMemo, useEffect } from 'react'
import { useApi, useMutation } from '@/hooks/use-api'
import { getChassis, pollChassis, addTags, removeTags, getConfiguredChassis } from '@/lib/api/endpoints'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RefreshCw, Plus, X, Search, Download } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { exportToCSV } from '@/lib/utils'

function ChassisPage() {
  // Fetch data immediately on mount
  const { data, loading, error, refetch } = useApi(getChassis, [], true)
  const { data: configuredChassisData, loading: configLoading, refetch: refetchConfig } = useApi(getConfiguredChassis, [], true)
  const { mutate: pollMutate } = useMutation(pollChassis)
  const { mutate: addTagsMutate } = useMutation(addTags)
  const { mutate: removeTagsMutate } = useMutation(removeTags)
  const { toast } = useToast()
  
  const [searchTerm, setSearchTerm] = useState('')
  const [tagDialogOpen, setTagDialogOpen] = useState(false)
  const [selectedChassis, setSelectedChassis] = useState(null)
  const [newTags, setNewTags] = useState('')
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  // Column-based filters - each column can have a selected filter value
  const [filters, setFilters] = useState({
    chassisIp: '',
    os: '',
    chassisType: '',
    chassisSerialNumber: '',
    controllerSerialNumber: '',
    physicalCardsNumber: '',
    IxOS: '',
    cpu_pert_usage: '',
    chassisStatus: '',
    tags: ''
  })

  const chassisList = data?.chassis || []
  const configuredChassis = configuredChassisData?.chassis || []
  const hasConfiguredChassis = configuredChassis.length > 0
  const hasChassisData = chassisList.length > 0

  // Additional logging when data changes
  useEffect(() => {
    console.log('ChassisPage: Data updated:', {
      chassisCount: chassisList.length,
      configuredCount: configuredChassis.length,
      hasChassisData,
      hasConfiguredChassis,
      loading,
      configLoading
    })
  }, [chassisList, configuredChassis, hasChassisData, hasConfiguredChassis, loading, configLoading])

  // Debug logging
  useEffect(() => {
    console.log('ChassisPage: Current state:', {
      data,
      chassisList,
      hasChassisData,
      hasConfiguredChassis,
      loading,
      configLoading
    })
  }, [data, chassisList, hasChassisData, hasConfiguredChassis, loading, configLoading])

  // Get unique values for each column
  const columnValues = useMemo(() => {
    const values = {
      chassisIp: new Set(),
      os: new Set(),
      chassisType: new Set(),
      chassisSerialNumber: new Set(),
      controllerSerialNumber: new Set(),
      physicalCardsNumber: new Set(),
      IxOS: new Set(),
      cpu_pert_usage: new Set(),
      chassisStatus: new Set(),
      tags: new Set()
    }

    chassisList.forEach((chassis) => {
      if (chassis.chassisIp) values.chassisIp.add(chassis.chassisIp)
      if (chassis.os && chassis.os !== 'NA') values.os.add(chassis.os)
      if (chassis.chassisType && chassis.chassisType !== 'NA') values.chassisType.add(chassis.chassisType)
      
      const serialNumber = chassis.chassisSerialNumber || chassis['chassisSerial#']
      if (serialNumber && serialNumber !== 'NA') values.chassisSerialNumber.add(serialNumber)
      
      const controllerSN = chassis.controllerSerialNumber || chassis['controllerSerial#']
      if (controllerSN && controllerSN !== 'NA') values.controllerSerialNumber.add(controllerSN)
      
      const physicalCards = chassis.physicalCardsNumber || chassis['physicalCards#']
      if (physicalCards && physicalCards !== 'NA') values.physicalCardsNumber.add(physicalCards.toString())
      
      if (chassis.IxOS && chassis.IxOS !== 'NA') values.IxOS.add(chassis.IxOS)
      if (chassis.cpu_pert_usage && chassis.cpu_pert_usage !== 'NA') values.cpu_pert_usage.add(chassis.cpu_pert_usage)
      if (chassis.chassisStatus && chassis.chassisStatus !== 'NA') values.chassisStatus.add(chassis.chassisStatus)
      
      if (chassis.tags && chassis.tags.length > 0) {
        chassis.tags.forEach(tag => values.tags.add(tag))
      }
    })

    // Convert Sets to sorted arrays
    return Object.fromEntries(
      Object.entries(values).map(([key, set]) => [key, Array.from(set).sort()])
    )
  }, [chassisList])

  // Filter chassis based on column filters and search term
  const filteredChassis = useMemo(() => {
    let filtered = chassisList

    // Apply column-based filters (AND logic - all filters must match)
    Object.entries(filters).forEach(([column, filterValue]) => {
      if (filterValue && filterValue !== '') {
        filtered = filtered.filter((chassis) => {
          switch (column) {
            case 'chassisIp':
              return chassis.chassisIp === filterValue
            case 'os':
              return chassis.os === filterValue
            case 'chassisType':
              return chassis.chassisType === filterValue
            case 'chassisSerialNumber':
              const serialNumber = chassis.chassisSerialNumber || chassis['chassisSerial#']
              return serialNumber === filterValue
            case 'controllerSerialNumber':
              const controllerSN = chassis.controllerSerialNumber || chassis['controllerSerial#']
              return controllerSN === filterValue
            case 'physicalCardsNumber':
              const physicalCards = chassis.physicalCardsNumber || chassis['physicalCards#']
              return physicalCards?.toString() === filterValue
            case 'IxOS':
              return chassis.IxOS === filterValue
            case 'cpu_pert_usage':
              return chassis.cpu_pert_usage === filterValue
            case 'chassisStatus':
              return chassis.chassisStatus === filterValue
            case 'tags':
              return chassis.tags && chassis.tags.includes(filterValue)
            default:
              return true
          }
        })
      }
    })

    // Apply search term filter (if any)
    if (searchTerm) {
    const term = searchTerm.toLowerCase()
      filtered = filtered.filter((chassis) => {
      const serialNumber = chassis['chassisSerial#'] || chassis.chassisSerialNumber || ''
      return (
        chassis.chassisIp?.toLowerCase().includes(term) ||
        serialNumber.toLowerCase().includes(term) ||
        chassis.chassisType?.toLowerCase().includes(term) ||
        chassis.tags?.some(tag => tag.toLowerCase().includes(term))
      )
    })
    }

    return filtered
  }, [chassisList, filters, searchTerm])

  const handleFilterChange = (column, value) => {
    setFilters(prev => ({
      ...prev,
      [column]: value === 'all' ? '' : value
    }))
  }

  const clearAllFilters = () => {
    setFilters({
      chassisIp: '',
      os: '',
      chassisType: '',
      chassisSerialNumber: '',
      controllerSerialNumber: '',
      physicalCardsNumber: '',
      IxOS: '',
      cpu_pert_usage: '',
      chassisStatus: '',
      tags: ''
    })
    setSearchTerm('')
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await pollMutate({}, {
        onSuccess: (response) => {
          toast({
            title: 'Polling Started',
            description: response?.message || 'Chassis data polling initiated. Please wait...',
          })
          // Wait longer for background task to complete (5 seconds)
          setTimeout(() => {
            refetch().then(() => {
              setIsRefreshing(false)
              toast({
                title: 'Success',
                description: 'Chassis data refreshed successfully',
              })
            }).catch(() => {
              setIsRefreshing(false)
            })
          }, 5000)
        },
        onError: (error) => {
          setIsRefreshing(false)
          toast({
            variant: 'destructive',
            title: 'Error',
            description: error.response?.data?.detail || 'Failed to poll chassis data',
          })
        }
      })
    } catch (err) {
      setIsRefreshing(false)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to poll chassis data',
      })
    }
  }

  const handleAddTags = () => {
    if (!selectedChassis || !newTags.trim()) return

    addTagsMutate({
      ip: selectedChassis.chassisIp,
      tags: newTags.trim(),
    }, {
      onSuccess: () => {
        toast({
          title: 'Success',
          description: 'Tags added successfully',
        })
        setTagDialogOpen(false)
        setNewTags('')
        setSelectedChassis(null)
        refetch()
      }
    })
  }

  const handleRemoveTags = (chassis, tagsToRemove) => {
    removeTagsMutate({
      ip: chassis.chassisIp,
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

  const openTagDialog = (chassis) => {
    setSelectedChassis(chassis)
    setNewTags('')
    setTagDialogOpen(true)
  }

  const handleExport = () => {
    if (filteredChassis.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No data to export',
      })
      return
    }

    const headers = [
      { key: 'chassisIp', label: 'IP Address' },
      { key: 'os', label: 'OS' },
      { key: 'chassisType', label: 'Type' },
      { key: 'chassisSerialNumber', label: 'Chassis SN' },
      { key: 'controllerSerialNumber', label: 'Controller SN' },
      { key: 'physicalCardsNumber', label: 'Physical Cards' },
      { key: 'IxOS', label: 'IxOS' },
      { key: 'mem_bytes', label: 'Memory Used' },
      { key: 'cpu_pert_usage', label: 'CPU %' },
      { key: 'chassisStatus', label: 'Status' },
      { key: 'tags', label: 'Tags' },
    ]

    // Prepare data for export
    const exportData = filteredChassis.map(chassis => ({
      chassisIp: chassis.chassisIp,
      os: chassis.os,
      chassisType: chassis.chassisType,
      chassisSerialNumber: chassis.chassisSerialNumber || chassis['chassisSerial#'] || 'N/A',
      controllerSerialNumber: chassis.controllerSerialNumber || chassis['controllerSerial#'] || 'N/A',
      physicalCardsNumber: chassis.physicalCardsNumber || chassis['physicalCards#'] || 'N/A',
      IxOS: chassis.IxOS,
      mem_bytes: chassis.mem_bytes && chassis.mem_bytes_total && 
                 chassis.mem_bytes !== 'NA' && chassis.mem_bytes_total !== 'NA'
        ? `${(parseInt(chassis.mem_bytes) / parseInt(chassis.mem_bytes_total) * 100).toFixed(1)}%`
        : 'N/A',
      cpu_pert_usage: `${chassis.cpu_pert_usage}%`,
      chassisStatus: chassis.chassisStatus,
      tags: chassis.tags && chassis.tags.length > 0 ? chassis.tags.join('; ') : 'No tags',
    }))

    exportToCSV(exportData, headers, `chassis_export_${new Date().toISOString().split('T')[0]}.csv`)
    toast({
      title: 'Success',
      description: 'Chassis data exported successfully',
    })
  }

  // Show loading state only if we don't have data yet
  if (loading && !hasChassisData && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading chassis data...</div>
      </div>
    )
  }

  // Show full chassis data table if we have data (regardless of configured chassis check)
  if (hasChassisData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-teal-400 bg-clip-text text-transparent">Chassis Details</h1>
          <div className="flex gap-2">
            <Button
              onClick={handleExport}
              variant="outline"
              disabled={filteredChassis.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export to Excel
            </Button>
            <Button
              onClick={handleRefresh}
              disabled={isRefreshing}
              variant="outline"
            >
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
                  placeholder="Search by IP, Serial Number, Type, or Tags..."
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
                  title="Filter by IP Address"
                >
                  <option value="all">Select All (IP)</option>
                  {columnValues.chassisIp.map((ip) => (
                    <option key={ip} value={ip}>{ip}</option>
                  ))}
                </Select>
                <Select
                  value={filters.os || 'all'}
                  onChange={(e) => handleFilterChange('os', e.target.value)}
                  className="min-w-[100px] text-xs bg-muted/60 border-cyan-500/30"
                  title="Filter by OS"
                >
                  <option value="all">Select All (OS)</option>
                  {columnValues.os.map((os) => (
                    <option key={os} value={os}>{os}</option>
                  ))}
                </Select>
                <Select
                  value={filters.chassisType || 'all'}
                  onChange={(e) => handleFilterChange('chassisType', e.target.value)}
                  className="min-w-[120px] text-xs bg-muted/60 border-cyan-500/30"
                  title="Filter by Type"
                >
                  <option value="all">Select All (Type)</option>
                  {columnValues.chassisType.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </Select>
                <Select
                  value={filters.chassisSerialNumber || 'all'}
                  onChange={(e) => handleFilterChange('chassisSerialNumber', e.target.value)}
                  className="min-w-[130px] text-xs bg-muted/60 border-cyan-500/30"
                  title="Filter by Chassis Serial Number"
                >
                  <option value="all">Select All (Chassis SN)</option>
                  {columnValues.chassisSerialNumber.map((sn) => (
                    <option key={sn} value={sn}>{sn}</option>
                  ))}
                </Select>
                <Select
                  value={filters.controllerSerialNumber || 'all'}
                  onChange={(e) => handleFilterChange('controllerSerialNumber', e.target.value)}
                  className="min-w-[130px] text-xs bg-muted/60 border-cyan-500/30"
                  title="Filter by Controller Serial Number"
                >
                  <option value="all">Select All (Controller SN)</option>
                  {columnValues.controllerSerialNumber.map((sn) => (
                    <option key={sn} value={sn}>{sn}</option>
                  ))}
                </Select>
                <Select
                  value={filters.physicalCardsNumber || 'all'}
                  onChange={(e) => handleFilterChange('physicalCardsNumber', e.target.value)}
                  className="min-w-[100px] text-xs bg-muted/60 border-cyan-500/30"
                  title="Filter by Physical Cards"
                >
                  <option value="all">Select All (Cards)</option>
                  {columnValues.physicalCardsNumber.map((cards) => (
                    <option key={cards} value={cards}>{cards}</option>
                  ))}
                </Select>
                <Select
                  value={filters.IxOS || 'all'}
                  onChange={(e) => handleFilterChange('IxOS', e.target.value)}
                  className="min-w-[100px] text-xs bg-muted/60 border-cyan-500/30"
                  title="Filter by IxOS"
                >
                  <option value="all">Select All (IxOS)</option>
                  {columnValues.IxOS.map((ixos) => (
                    <option key={ixos} value={ixos}>{ixos}</option>
                  ))}
                </Select>
                <Select
                  value={filters.cpu_pert_usage || 'all'}
                  onChange={(e) => handleFilterChange('cpu_pert_usage', e.target.value)}
                  className="min-w-[100px] text-xs bg-muted/60 border-cyan-500/30"
                  title="Filter by CPU %"
                >
                  <option value="all">Select All (CPU %)</option>
                  {columnValues.cpu_pert_usage.map((cpu) => (
                    <option key={cpu} value={cpu}>{cpu}%</option>
                  ))}
                </Select>
                <Select
                  value={filters.chassisStatus || 'all'}
                  onChange={(e) => handleFilterChange('chassisStatus', e.target.value)}
                  className="min-w-[110px] text-xs bg-muted/60 border-cyan-500/30"
                  title="Filter by Status"
                >
                  <option value="all">Select All (Status)</option>
                  {columnValues.chassisStatus.map((status) => (
                    <option key={status} value={status}>{status}</option>
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
                    <TableHead>IP Address</TableHead>
                    <TableHead>OS</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Chassis SN</TableHead>
                    <TableHead>Controller SN</TableHead>
                    <TableHead>Physical Cards</TableHead>
                    <TableHead>IxOS</TableHead>
                    <TableHead>Memory Used</TableHead>
                    <TableHead>CPU %</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredChassis.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={12} className="text-center text-muted-foreground">
                        No chassis found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredChassis.map((chassis) => (
                      <TableRow key={chassis.chassisIp}>
                        <TableCell className="font-medium">{chassis.chassisIp}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {chassis.os && chassis.os.toLowerCase() === 'linux' ? (
                              <>
                                <img 
                                  src="/linux-logo.svg" 
                                  alt="Linux" 
                                  className="w-6 h-6 object-contain"
                                  onError={(e) => {
                                    e.target.style.display = 'none'
                                  }}
                                />
                                <span>{chassis.os}</span>
                              </>
                            ) : (
                              <span>{chassis.os && chassis.os !== 'NA' ? chassis.os : 'N/A'}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{chassis.chassisType && chassis.chassisType !== 'NA' ? chassis.chassisType : 'N/A'}</TableCell>
                        <TableCell>{chassis.chassisSerialNumber || chassis['chassisSerial#'] || 'N/A'}</TableCell>
                        <TableCell>{chassis.controllerSerialNumber || chassis['controllerSerial#'] || 'N/A'}</TableCell>
                        <TableCell>{chassis.physicalCardsNumber || chassis['physicalCards#'] || 'N/A'}</TableCell>
                        <TableCell>{chassis.IxOS && chassis.IxOS !== 'NA' ? chassis.IxOS : 'N/A'}</TableCell>
                        <TableCell>
                          {chassis.mem_bytes && chassis.mem_bytes_total && 
                           chassis.mem_bytes !== 'NA' && chassis.mem_bytes_total !== 'NA'
                            ? `${(parseInt(chassis.mem_bytes) / parseInt(chassis.mem_bytes_total) * 100).toFixed(1)}%`
                            : 'N/A'}
                        </TableCell>
                        <TableCell>{chassis.cpu_pert_usage && chassis.cpu_pert_usage !== 'NA' ? `${chassis.cpu_pert_usage}%` : 'N/A'}</TableCell>
                        <TableCell>
                          <span
                            className={`px-2 py-1 rounded text-xs font-semibold ${
                              chassis.chassisStatus === 'Ready' || chassis.chassisStatus === 'UP'
                                ? 'bg-green-100 text-green-800'
                                : chassis.chassisStatus === 'Not Reachable' || chassis.chassisStatus === 'Not Available'
                                ? 'bg-red-200 text-red-900 border border-red-400'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {chassis.chassisStatus || 'N/A'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {chassis.tags && chassis.tags.length > 0 ? (
                              chassis.tags.map((tag, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-1 px-2 py-1 bg-secondary text-secondary-foreground rounded text-xs"
                                >
                                  {tag}
                                  <button
                                    onClick={() => handleRemoveTags(chassis, tag)}
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
                            onClick={() => openTagDialog(chassis)}
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
              Showing {filteredChassis.length} of {chassisList.length} chassis
            </div>
          </CardContent>
        </Card>

        {/* Add Tags Dialog */}
        <Dialog open={tagDialogOpen} onOpenChange={setTagDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Tags</DialogTitle>
              <DialogDescription>
                Add tags for {selectedChassis?.chassisIp}. Separate multiple tags with commas.
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

  // Show empty state when no chassis configured
  if (!hasConfiguredChassis && !configLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-teal-400 bg-clip-text text-transparent">Chassis Details</h1>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="text-center space-y-4">
              <div className="text-6xl mb-4">📡</div>
              <h2 className="text-2xl font-semibold">No Chassis Configured</h2>
              <p className="text-muted-foreground max-w-md">
                Get started by adding your first chassis IP address. Once configured, you can poll data and view chassis details.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show configured chassis but no data yet
  if (hasConfiguredChassis && !hasChassisData && !loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-teal-400 bg-clip-text text-transparent">Chassis Details</h1>
          <div className="flex gap-2">
            <Button
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Poll Data
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-center space-y-4">
              <div className="text-4xl mb-4">📊</div>
              <h2 className="text-xl font-semibold">No Data Available</h2>
              <p className="text-muted-foreground">
                Click "Poll Data" to fetch chassis information from the configured IPs.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show error state
  if (error && !hasChassisData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-destructive">Error loading chassis data: {error}</div>
      </div>
    )
  }

  // Fallback: Show empty state if no data and no error
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-teal-400 bg-clip-text text-transparent">Chassis Details</h1>
        <div className="flex gap-2">
          <Button
            onClick={handleRefresh}
            disabled={isRefreshing}
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="text-center space-y-4">
            <div className="text-4xl mb-4">📊</div>
            <h2 className="text-xl font-semibold">No Data Available</h2>
            <p className="text-muted-foreground">
              {hasConfiguredChassis 
                ? 'Click "Refresh" to fetch chassis information from the configured IPs.'
                : 'Configure chassis IPs in the Config tab to get started.'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default ChassisPage
