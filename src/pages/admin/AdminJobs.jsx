import React from 'react';
import JobBoard from '../../components/JobBoard';

const AdminJobs = () => {
  return <JobBoard isAdmin={true} />;
};

export default AdminJobs;
