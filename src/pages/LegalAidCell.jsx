import React from 'react';

// Renders the standalone HTML prototype (public/legal_aid_cell_prototype.html)
// via iframe rather than porting its markup/styles into a React component --
// it's a complete, self-contained document with its own full CSS, and an
// iframe avoids any collision with the main app's global styles.
// Width capped at 1100px, matching Dashboard.jsx's content column -- the
// iframe's content reflows to fit since it's its own rendering context.
const LegalAidCell = () => (
  <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
    <iframe
      src="/legal_aid_cell_prototype.html"
      title="Legal Aid Cell"
      style={{ border: 'none', width: '100%', height: 'calc(100vh - 80px)', display: 'block' }}
    />
  </div>
);

export default LegalAidCell;
