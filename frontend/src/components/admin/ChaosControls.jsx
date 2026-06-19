import api from '../../services/api';

export const ChaosControls = () => {
  const killService = async (serviceName) => {
    try {
      await api.post('/chaos/kill', { service: serviceName });
      alert(`${serviceName} killed! Check the Health Grid.`);
    } catch (err) {
      console.error("Failed to kill service", err);
    }
  };

  return (
    <div className="p-4 border-2 border-red-500 rounded">
      <h3 className="font-bold text-red-600">Chaos Console</h3>
      <button onClick={() => killService('kitchen')} className="bg-red-600 text-white p-2 m-2">
        Kill Kitchen Service
      </button>
    </div>
  );
};