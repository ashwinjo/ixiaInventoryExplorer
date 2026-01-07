import { useState } from 'react'
import { useMutation } from '@/hooks/use-api'
import { uploadConfig, setPollingIntervals } from '@/lib/api/endpoints'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'

function ConfigPage() {
  const [configText, setConfigText] = useState('')
  const [intervals, setIntervals] = useState({
    chassis: 60,
    cards: 60,
    ports: 60,
    sensors: 60,
    licensing: 120,
    perf: 60,
    purge: 86400,
  })
  const { mutate: uploadMutate, loading: uploadLoading } = useMutation(uploadConfig)
  const { mutate: intervalsMutate, loading: intervalsLoading } = useMutation(setPollingIntervals)
  const { toast } = useToast()

  const handleConfigSubmit = (e) => {
    e.preventDefault()
    
    if (!configText.trim()) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please enter configuration data',
      })
      return
    }

    uploadMutate(
      { text: configText },
      {
        onSuccess: () => {
          toast({
            title: 'Success',
            description: 'Configuration uploaded successfully',
          })
          setConfigText('')
        },
        onError: (error) => {
          toast({
            variant: 'destructive',
            title: 'Error',
            description: error.response?.data?.detail || 'Failed to upload configuration',
          })
        },
      }
    )
  }

  const handleIntervalsChange = (field, value) => {
    const numValue = parseInt(value) || 0
    setIntervals((prev) => ({
      ...prev,
      [field]: numValue,
    }))
  }

  const handleIntervalsSubmit = (e) => {
    e.preventDefault()

    // Validate all intervals are positive
    const hasInvalid = Object.values(intervals).some((val) => val <= 0)
    if (hasInvalid) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'All intervals must be greater than 0',
      })
      return
    }

    intervalsMutate(
      {
        chassis: intervals.chassis,
        cards: intervals.cards,
        ports: intervals.ports,
        sensors: intervals.sensors,
        licensing: intervals.licensing,
        perf: intervals.perf,
        purge: intervals.purge,
      },
      {
        onSuccess: () => {
          toast({
            title: 'Success',
            description: 'Polling intervals updated successfully',
          })
        },
        onError: (error) => {
          toast({
            variant: 'destructive',
            title: 'Error',
            description: error.response?.data?.detail || 'Failed to update polling intervals',
          })
        },
      }
    )
  }

  const exampleConfig = `ADD,192.168.1.100,admin,password
ADD,192.168.1.101,admin,password
DELETE,192.168.1.100,admin,password`

  const intervalFields = [
    { key: 'chassis', label: 'Chassis Polling Interval', description: 'Interval for polling chassis data (seconds)' },
    { key: 'cards', label: 'Cards Polling Interval', description: 'Interval for polling card data (seconds)' },
    { key: 'ports', label: 'Ports Polling Interval', description: 'Interval for polling port data (seconds)' },
    { key: 'sensors', label: 'Sensors Polling Interval', description: 'Interval for polling sensor data (seconds)' },
    { key: 'licensing', label: 'Licensing Polling Interval', description: 'Interval for polling license data (seconds)' },
    { key: 'perf', label: 'Performance Metrics Polling Interval', description: 'Interval for polling performance metrics (seconds)' },
    { key: 'purge', label: 'Data Purge Interval', description: 'Interval for purging old performance data (seconds, typically 86400 = 1 day)' },
  ]

  return (
    <div className="space-y-8">
      {/* Chassis Configuration Section */}
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-cyan-400">Chassis Configuration</h2>
          <p className="text-muted-foreground mt-1">
            Add, delete, or update chassis in the inventory
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Upload Configuration</CardTitle>
              <CardDescription>
                Enter chassis configuration in CSV format. Each line should follow: operation,ip,username,password
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleConfigSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Configuration (CSV Format)
                  </label>
                  <textarea
                    value={configText}
                    onChange={(e) => setConfigText(e.target.value)}
                    placeholder={exampleConfig}
                    className="w-full min-h-[200px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Operations: ADD, DELETE, UPDATE. Format: operation,ip,username,password
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" disabled={uploadLoading}>
                    {uploadLoading ? 'Uploading...' : 'Upload Configuration'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setConfigText(exampleConfig)}
                  >
                    Load Example
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setConfigText('')}
                  >
                    Clear
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Configuration Format</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">CSV Format:</h3>
                  <pre className="bg-muted p-4 rounded-md text-sm overflow-x-auto">
                    {exampleConfig}
                  </pre>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Operations:</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li><strong>ADD:</strong> Add a new chassis to the inventory</li>
                    <li><strong>DELETE:</strong> Remove a chassis from the inventory</li>
                    <li><strong>UPDATE:</strong> Update credentials for an existing chassis</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Fields:</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li><strong>operation:</strong> ADD, DELETE, or UPDATE</li>
                    <li><strong>ip:</strong> Chassis IP address</li>
                    <li><strong>username:</strong> Username for chassis authentication</li>
                    <li><strong>password:</strong> Password for chassis authentication</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Divider */}
      <hr className="border-border" />

      {/* Polling Settings Section */}
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-teal-400">Polling Settings</h2>
          <p className="text-muted-foreground mt-1">
            Configure polling intervals for data collection
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Polling Intervals</CardTitle>
              <CardDescription>
                Set the polling intervals (in seconds) for each data category. Lower values mean more frequent updates but higher system load.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleIntervalsSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {intervalFields.map((field) => (
                    <div key={field.key} className="space-y-2">
                      <label className="text-sm font-medium">
                        {field.label}
                      </label>
                      <Input
                        type="number"
                        min="1"
                        value={intervals[field.key]}
                        onChange={(e) => handleIntervalsChange(field.key, e.target.value)}
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        {field.description}
                      </p>
                      {field.key === 'purge' && (
                        <p className="text-xs text-blue-600 dark:text-blue-400">
                          Current: {Math.floor(intervals.purge / 3600)} hours ({intervals.purge} seconds)
                        </p>
                      )}
                      {field.key !== 'purge' && (
                        <p className="text-xs text-blue-600 dark:text-blue-400">
                          Current: {intervals[field.key]} seconds ({Math.floor(intervals[field.key] / 60)} minutes)
                        </p>
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" disabled={intervalsLoading}>
                    {intervalsLoading ? 'Saving...' : 'Save Settings'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIntervals({
                        chassis: 60,
                        cards: 60,
                        ports: 60,
                        sensors: 60,
                        licensing: 120,
                        perf: 60,
                        purge: 86400,
                      })
                    }}
                  >
                    Reset to Defaults
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recommended Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <p><strong>Chassis:</strong> 60 seconds (1 minute) - Frequent updates for status monitoring</p>
                <p><strong>Cards:</strong> 60 seconds (1 minute) - Regular card status checks</p>
                <p><strong>Ports:</strong> 60 seconds (1 minute) - Monitor port states frequently</p>
                <p><strong>Sensors:</strong> 60 seconds (1 minute) - Track sensor readings</p>
                <p><strong>Licensing:</strong> 120 seconds (2 minutes) - Licenses change less frequently</p>
                <p><strong>Performance:</strong> 60 seconds (1 minute) - Real-time performance monitoring</p>
                <p><strong>Data Purge:</strong> 86400 seconds (24 hours) - Clean up old performance data daily</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default ConfigPage
