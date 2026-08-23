import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import ResourcesTab from './ResourcesTab';

const ResourcesPage = () => {
  const [subjects, setSubjects] = useState([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('lc_subjects').select('id,name').order('name');
      setSubjects(data || []);
    })();
  }, []);

  return <ResourcesTab subjects={subjects} />;
};

export default ResourcesPage;
