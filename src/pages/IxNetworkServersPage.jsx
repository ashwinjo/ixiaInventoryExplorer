import { useState, useMemo } from 'react'
import { useApi } from '@/hooks/use-api'
import { getIxNetworkServers, getConfiguredIxNetworkServers } from '@/lib/api/endpoints'
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
import { RefreshCw, Search, Download, Server } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { exportToCSV, getLastPolledTime } from '@/lib/utils'

function IxNetworkServersPage() {
  const { data, loading, error, refetch } = useApi(getIxNetworkServers, [], true)
  const { data: configuredData, loading: configLoading } = useApi(getConfiguredIxNetworkServers, [], true)
  const { toast } = useToast()
  
  const [searchTerm, setSearchTerm] = useState('')
  const [isRefreshing, setIsRefreshing] = useState(false)

  const serverList = data?.servers || []
  const configuredServers = configuredData?.servers || []
  const hasConfiguredServers = configuredServers.length > 0
  const hasServerData = serverList.length > 0

  // Filter servers based on search term
  const filteredServers = useMemo(() => {
    if (!searchTerm) return serverList
    const term = searchTerm.toLowerCase()
    return serverList.filter((server) =>
      server.ixnetwork_api_server_ip?.toLowerCase().includes(term)
    )
  }, [serverList, searchTerm])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await refetch()
      toast({
        title: 'Success',
        description: 'IxNetwork server data refreshed',
      })
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to refresh data',
      })
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleExport = () => {
    if (filteredServers.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No data to export',
      })
      return
    }

    const headers = [
      { key: 'ixnetwork_api_server_ip', label: 'API Server IP' },
      { key: 'ixnetwork_api_server_sessions', label: 'Sessions' },
      { key: 'lastUpdatedAt_UTC', label: 'Last Updated (UTC)' },
    ]

    exportToCSV(filteredServers, headers, `ixnetwork_servers_export_${new Date().toISOString().split('T')[0]}.csv`)
    toast({
      title: 'Success',
      description: 'IxNetwork server data exported successfully',
    })
  }

  // Loading state
  if (loading && !hasServerData && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading IxNetwork server data...</div>
      </div>
    )
  }

  // Show data table if we have data
  if (hasServerData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              IxNetwork API Servers
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Last Polled at: <span className="text-teal-400 font-mono">{getLastPolledTime(serverList)}</span>
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleExport}
              variant="outline"
              disabled={filteredServers.length === 0}
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
            <div className="flex items-center space-x-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by IP address..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>API Server IP</TableHead>
                    <TableHead>Sessions</TableHead>
                    <TableHead>Last Updated (UTC)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredServers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        No servers found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredServers.map((server) => (
                      <TableRow key={server.ixnetwork_api_server_ip}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Server className="h-4 w-4 text-purple-400" />
                            {server.ixnetwork_api_server_ip}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded text-sm ${
                            server.ixnetwork_api_server_sessions === '0' 
                              ? 'bg-gray-500/20 text-gray-400' 
                              : 'bg-green-500/20 text-green-400'
                          }`}>
                            {server.ixnetwork_api_server_sessions}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {server.lastUpdatedAt_UTC || 'N/A'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="mt-4 text-sm text-muted-foreground">
              Showing {filteredServers.length} of {serverList.length} servers
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Empty state - no servers configured
  if (!hasConfiguredServers && !configLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            IxNetwork API Servers
          </h1>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="text-center space-y-4">
              <div className="text-6xl mb-4">🖥️</div>
              <h2 className="text-2xl font-semibold">No API Servers Configured</h2>
              <p className="text-muted-foreground max-w-md">
                Get started by adding your IxNetwork API server credentials in the Config page.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Has configured servers but no polled data yet
  if (hasConfiguredServers && !hasServerData && !loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            IxNetwork API Servers
          </h1>
          <Button
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-center space-y-4">
              <div className="text-4xl mb-4">📊</div>
              <h2 className="text-xl font-semibold">No Data Available</h2>
              <p className="text-muted-foreground">
                Run the poller to fetch IxNetwork server session data.
              </p>
              <code className="text-sm bg-muted px-3 py-2 rounded">
                python3 data_poller.py --category ixnetwork
              </code>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Error state
  if (error && !hasServerData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-destructive">Error loading data: {error}</div>
      </div>
    )
  }

  // Fallback
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          IxNetwork API Servers
        </h1>
        <Button
          onClick={handleRefresh}
          disabled={isRefreshing}
          variant="outline"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="text-center space-y-4">
            <div className="text-4xl mb-4">📊</div>
            <h2 className="text-xl font-semibold">No Data Available</h2>
            <p className="text-muted-foreground">
              {hasConfiguredServers 
                ? 'Run the poller to fetch IxNetwork server data.'
                : 'Configure API servers in the Config page to get started.'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default IxNetworkServersPage

