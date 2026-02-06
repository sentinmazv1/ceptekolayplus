// Test Personnel API - Check deliveredLeads
fetch('https://filoyen.com/api/reports/personnel?startDate=2026-01-01&endDate=2026-02-06')
    .then(res => res.json())
    .then(data => {
        console.log('API Response:', data);
        console.log('Delivered Leads Count:', data.deliveredLeads?.length || 0);
        console.log('First 3 Delivered Leads:', data.deliveredLeads?.slice(0, 3));
    })
    .catch(err => console.error('Error:', err));
