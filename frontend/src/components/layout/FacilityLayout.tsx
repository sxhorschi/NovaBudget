import React, { useEffect } from 'react';
import { Outlet, useParams } from 'react-router-dom';
import TopBar from './TopBar';
import ViewBar from './ViewBar';
import { useFacility } from '../../context/FacilityContext';

const FacilityLayout: React.FC = () => {
  const { facilityId } = useParams<{ facilityId: string }>();
  const { setCurrentFacility } = useFacility();

  // Sync the URL facilityId into context so downstream consumers stay in sync
  useEffect(() => {
    if (facilityId) {
      setCurrentFacility(facilityId);
    }
  }, [facilityId, setCurrentFacility]);

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <TopBar />
      <ViewBar />
      <main className="relative z-0 flex-1">
        <Outlet />
      </main>
    </div>
  );
};

export default FacilityLayout;
