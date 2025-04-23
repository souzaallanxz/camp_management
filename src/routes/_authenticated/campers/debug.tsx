import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

// Define the component first
function CampersDebugPage() {
  const [campers, setCampers] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [dataStructure, setDataStructure] = useState<string | null>(null);

  const loadCampers = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await db
        .from('campers')
        .select(`
          *,
          registration:registration_id (
            snackbar_balance (
              amount
            )
          )
        `)
        .order('created_at', { ascending: false });
      
      setDataStructure(JSON.stringify(result, null, 2));
      
      if (result.data) {
        setCampers(result.data);
      } else {
        setCampers([]);
        setError("Nenhum dado retornado, mas sem erro específico");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const loadCampersDirect = async () => {
    setLoading(true);
    setError(null);
    try {
      // Tentativa direta de SQL
      const result = await db.query(`
        SELECT * FROM campers ORDER BY created_at DESC
      `);
      
      setDataStructure(JSON.stringify(result, null, 2));
      
      if (result.data) {
        setCampers(result.data);
      } else {
        setCampers([]);
        setError("Nenhum dado retornado do SQL direto, mas sem erro específico");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-6">Campers Debug Page</h1>
      <p className="mb-4">Esta página exibe todos os campistas no banco de dados sem qualquer filtragem.</p>
      
      <div className="flex gap-4 mb-6">
        <Button 
          onClick={loadCampers} 
          disabled={loading}
          variant="default"
        >
          {loading ? 'Carregando...' : 'Carregar Campistas ORM'}
        </Button>
        
        <Button 
          onClick={loadCampersDirect} 
          disabled={loading}
          variant="secondary"
        >
          {loading ? 'Carregando...' : 'Carregar Campistas SQL'}
        </Button>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <strong className="font-bold">Erro:</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}

      {dataStructure && (
        <div className="bg-gray-100 p-4 mb-6 rounded overflow-auto max-h-[300px]">
          <h2 className="text-lg font-semibold mb-2">Estrutura de Dados Retornada:</h2>
          <pre>{dataStructure}</pre>
        </div>
      )}
      
      <div className="mb-4">
        <strong>Total de Campistas Encontrados:</strong> {campers.length}
      </div>
      
      {campers.length > 0 ? (
        <div className="border rounded-md">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contato</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Inscrição ID</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {campers.map((camper) => (
                <tr key={camper.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{camper.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{camper.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{camper.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{camper.contact}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{camper.registration_id || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        campers.length === 0 && !loading && !error && <p>Nenhum campista encontrado.</p>
      )}
    </div>
  );
}

// Export the route configuration
export const Route = createFileRoute("/_authenticated/campers/debug")({
  component: CampersDebugPage
}); 