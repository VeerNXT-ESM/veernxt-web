const test = async () => {
  try {
    const res = await fetch('http://localhost:8080/api/admin/save-resource', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: '9cf56bba-c1d0-42c4-87d6-1ce951275563',
        dataToSave: { title: 'Test Title' }
      })
    });
    const text = await res.text();
    console.log('Status:', res.status);
    console.log('Response:', text);
  } catch (err) {
    console.error('Fetch error:', err);
  }
};
test();
