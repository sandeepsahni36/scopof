import React from 'react';
import { useParams } from 'react-router-dom';

const InspectionPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Inspection</h1>
        <p className="text-gray-600">Inspection ID: {id}</p>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-500">Inspection page content will be implemented here.</p>
      </div>
    </div>
  );
};

export default InspectionPage;