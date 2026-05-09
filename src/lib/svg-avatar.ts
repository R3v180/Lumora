// Procedural SVG Avatar Generator
// Generates a unique, abstract geometric pattern based on a string seed (like userId or name).

export function generateSvgAvatar(seed: string): string {
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Generate colors based on hash
  const c1 = `hsl(${Math.abs(hash) % 360}, 70%, 60%)`;
  const c2 = `hsl(${Math.abs(hash * 2) % 360}, 80%, 40%)`;
  const c3 = `hsl(${Math.abs(hash * 3) % 360}, 60%, 50%)`;

  // Determine shapes based on hash bits
  const showCircle = (hash & 1) === 0;
  const showRect = (hash & 2) === 0;
  const showPoly = (hash & 4) === 0;

  const size = 100;
  
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
      <defs>
        <linearGradient id="bg-${hash}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${c1}" />
          <stop offset="100%" stop-color="${c2}" />
        </linearGradient>
      </defs>
      <rect width="${size}" height="${size}" fill="url(#bg-${hash})" />
      
      ${showCircle ? `<circle cx="${Math.abs(hash % 30) + 35}" cy="${Math.abs((hash >> 2) % 30) + 35}" r="${Math.abs((hash >> 4) % 20) + 15}" fill="${c3}" opacity="0.8" />` : ''}
      
      ${showRect ? `<rect x="${Math.abs((hash >> 6) % 40) + 10}" y="${Math.abs((hash >> 8) % 40) + 10}" width="${Math.abs((hash >> 10) % 30) + 20}" height="${Math.abs((hash >> 12) % 30) + 20}" fill="${c1}" opacity="0.6" transform="rotate(${hash % 90} 50 50)" />` : ''}
      
      ${showPoly ? `<polygon points="${Math.abs((hash>>14)%50)},${Math.abs((hash>>16)%50)} ${Math.abs((hash>>18)%50)+50},${Math.abs((hash>>20)%50)} ${Math.abs((hash>>22)%50)+25},${Math.abs((hash>>24)%50)+50}" fill="#ffffff" opacity="0.4" />` : ''}
    </svg>
  `;

  // Convert to base64 data URI
  const encodedSvg = typeof window !== 'undefined' 
    ? btoa(svg) 
    : Buffer.from(svg).toString('base64');
    
  return `data:image/svg+xml;base64,${encodedSvg}`;
}
