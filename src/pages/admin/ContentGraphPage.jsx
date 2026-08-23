import { useNavigate } from 'react-router-dom';
import ContentGraphTab from './ContentGraphTab';

const ContentGraphPage = () => {
  const navigate = useNavigate();
  return <ContentGraphTab navigate={navigate} />;
};

export default ContentGraphPage;
