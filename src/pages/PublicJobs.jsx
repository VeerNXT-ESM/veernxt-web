import React from 'react';
import JobBoard from '../components/JobBoard';

const PublicJobs = () => {
  return <JobBoard isAdmin={false} />;
};

export default PublicJobs;
