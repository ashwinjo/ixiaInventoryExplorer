import { useState, useEffect } from 'react'
import { useApi } from '@/hooks/use-api'
import { getChassisList, getPerformanceMetrics } from '@/lib/api/endpoints'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { RefreshCw } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

function PerformancePage() {
  const { data: chassisListData } = useApi(getChassisList)
  const [selectedIp, setSelectedIp] = useState('fresh')
  const [metricsData, setMetricsData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const { toast } = useToast()

  const chassisList = chassisListData?.chassis || []

  useEffect(() => {
    if (selectedIp && selectedIp !== 'fresh') {
      loadMetrics()
    } else {
      setMetricsData(null)
    }
  }, [selectedIp])

  const loadMetrics = async () => {
    if (!selectedIp || selectedIp === 'fresh') return

    setLoading(true)
    try {
      const response = await getPerformanceMetrics(selectedIp)
      setMetricsData(response.data)
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load performance metrics',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadMetrics()
    setTimeout(() => {
      setRefreshing(false)
      toast({
        title: 'Success',
        description: 'Performance metrics refreshed',
      })
    }, 1000)
  }

  // Transform data for charts
  const chartData = metricsData?.metrics?.map((metric) => ({
    time: new Date(metric.lastUpdatedAt_UTC).toLocaleTimeString(),
    memory: parseFloat(metric.mem_utilization) || 0,
    cpu: parseFloat(metric.cpu_utilization) || 0,
  })) || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-teal-400 bg-clip-text text-transparent">Performance Metrics</h1>
        {selectedIp && selectedIp !== 'fresh' && (
          <Button onClick={handleRefresh} disabled={refreshing} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Chassis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <Select
              value={selectedIp}
              onChange={(e) => setSelectedIp(e.target.value)}
              className="w-64"
            >
              <option value="fresh">Select a chassis...</option>
              {chassisList.map((chassis) => (
                <option key={chassis.ip} value={chassis.ip}>
                  {chassis.ip}
                </option>
              ))}
            </Select>
          </div>
        </CardContent>
      </Card>

      {selectedIp && selectedIp !== 'fresh' && (
        <>
          {loading ? (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <div className="text-muted-foreground">Loading performance metrics...</div>
              </CardContent>
            </Card>
          ) : chartData.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <div className="text-muted-foreground">No performance data available</div>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Memory Utilization (%)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="time"
                        tick={{ fontSize: 12 }}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis
                        domain={[0, 100]}
                        label={{ value: 'Utilization %', angle: -90, position: 'insideLeft' }}
                      />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="memory"
                        stroke="#8884d8"
                        strokeWidth={2}
                        name="Memory %"
                        dot={{ r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>CPU Utilization (%)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="time"
                        tick={{ fontSize: 12 }}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis
                        domain={[0, 100]}
                        label={{ value: 'Utilization %', angle: -90, position: 'insideLeft' }}
                      />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="cpu"
                        stroke="#82ca9d"
                        strokeWidth={2}
                        name="CPU %"
                        dot={{ r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Combined Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="time"
                        tick={{ fontSize: 12 }}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis
                        domain={[0, 100]}
                        label={{ value: 'Utilization %', angle: -90, position: 'insideLeft' }}
                      />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="memory"
                        stroke="#8884d8"
                        strokeWidth={2}
                        name="Memory %"
                        dot={{ r: 4 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="cpu"
                        stroke="#82ca9d"
                        strokeWidth={2}
                        name="CPU %"
                        dot={{ r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Metrics Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Current Memory Utilization</p>
                      <p className="text-2xl font-bold">
                        {chartData.length > 0
                          ? `${chartData[chartData.length - 1].memory.toFixed(1)}%`
                          : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Current CPU Utilization</p>
                      <p className="text-2xl font-bold">
                        {chartData.length > 0
                          ? `${chartData[chartData.length - 1].cpu.toFixed(1)}%`
                          : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Average Memory Utilization</p>
                      <p className="text-2xl font-bold">
                        {chartData.length > 0
                          ? `${(chartData.reduce((sum, d) => sum + d.memory, 0) / chartData.length).toFixed(1)}%`
                          : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Average CPU Utilization</p>
                      <p className="text-2xl font-bold">
                        {chartData.length > 0
                          ? `${(chartData.reduce((sum, d) => sum + d.cpu, 0) / chartData.length).toFixed(1)}%`
                          : 'N/A'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  )
}

export default PerformancePage
