// Test attorney history API directly
const startDate = '2026-02-01';
const endDate = '2026-02-06';

fetch(`https://ceptekolay.com/api/reports/personnel?startDate=${startDate}&endDate=${endDate}`)
    .then(res => res.json())
    .then(data => {
        console.log('API Response:', data);
        console.log('Personnel data:', data.data);

        // Check if attorney data exists
        const personnelWithAttorney = data.data?.filter(p =>
            p.attorneyQuery > 0 || p.attorneyClean > 0 || p.attorneyRisky > 0
        );

        console.log('Personnel with attorney data:', personnelWithAttorney);
    })
    .catch(err => console.error('Error:', err));
