import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getAuthToken, getTeamId, getTeamIdHeader } from '@/lib/auth';

export function DebugPanel() {
  const [authInfo, setAuthInfo] = useState({
    token: null as string | null,
    teamId: null as string | null,
    headers: {} as Record<string, string>,
    apiUrl: '',
    localStorage: {} as Record<string, string>
  });
  const [showPanel, setShowPanel] = useState(false);

  useEffect(() => {
    if (showPanel) {
      const token = getAuthToken();
      const teamId = getTeamId();
      const headers = getTeamIdHeader();
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      
      // Get all localStorage items related to auth
      const localStorageItems: Record<string, string> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const value = localStorage.getItem(key);
          if (value) {
            localStorageItems[key] = value;
          }
        }
      }
      
      setAuthInfo({
        token,
        teamId,
        headers: headers as Record<string, string>,
        apiUrl,
        localStorage: localStorageItems
      });
    }
  }, [showPanel]);

  if (!showPanel) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button onClick={() => setShowPanel(true)} variant="outline">
          Debug Auth
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <Card className="w-[80%] max-w-3xl max-h-[80vh] overflow-auto">
        <CardHeader>
          <CardTitle className="flex justify-between">
            <span>Auth Debug Information</span>
            <Button variant="ghost" onClick={() => setShowPanel(false)}>×</Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold">API URL:</h3>
              <pre className="mt-1 p-2 bg-muted rounded-md">{authInfo.apiUrl}</pre>
            </div>
            
            <div>
              <h3 className="font-semibold">Auth Token:</h3>
              <pre className="mt-1 p-2 bg-muted rounded-md whitespace-pre-wrap">
                {authInfo.token ? `${authInfo.token.substring(0, 20)}...` : 'Not found'}
              </pre>
            </div>
            
            <div>
              <h3 className="font-semibold">Team ID:</h3>
              <pre className="mt-1 p-2 bg-muted rounded-md">{authInfo.teamId || 'Not found'}</pre>
            </div>
            
            <div>
              <h3 className="font-semibold">API Headers:</h3>
              <pre className="mt-1 p-2 bg-muted rounded-md whitespace-pre-wrap overflow-auto">
                {JSON.stringify(authInfo.headers, null, 2)}
              </pre>
            </div>
            
            <div>
              <h3 className="font-semibold">LocalStorage Values:</h3>
              <pre className="mt-1 p-2 bg-muted rounded-md whitespace-pre-wrap overflow-auto">
                {JSON.stringify(authInfo.localStorage, null, 2)}
              </pre>
            </div>

            <div className="pt-2 flex justify-between">
              <Button 
                onClick={() => {
                  // Copy debug info to clipboard
                  navigator.clipboard.writeText(JSON.stringify(authInfo, null, 2));
                }}
                variant="outline"
              >
                Copy to Clipboard
              </Button>
              <Button 
                onClick={() => setShowPanel(false)}
                variant="default"
              >
                Close
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 