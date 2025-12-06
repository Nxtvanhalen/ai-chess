/**
 * Board Theme System
 * Texture-based themes that can be switched randomly or on demand
 */

export interface BoardTheme {
  id: string;
  name: string;
  darkSquare: {
    background: string;
    boxShadow?: string;
  };
  lightSquare: {
    background: string;
    boxShadow?: string;
  };
  boardStyle: {
    borderRadius: string;
    boxShadow: string;
    border: string;
    background?: string;
  };
}

export const boardThemes: BoardTheme[] = [
  // 1. WOOD GRAIN - Classic walnut and maple
  {
    id: 'wood',
    name: 'Classic Wood',
    darkSquare: {
      background: `
        linear-gradient(90deg,
          hsl(25 40% 25%) 0%,
          hsl(25 35% 22%) 25%,
          hsl(25 40% 28%) 50%,
          hsl(25 35% 20%) 75%,
          hsl(25 40% 25%) 100%
        ),
        repeating-linear-gradient(
          0deg,
          transparent 0px,
          rgba(0,0,0,0.03) 1px,
          transparent 2px,
          transparent 4px
        )
      `,
      boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.3), inset 0 -1px 2px rgba(255, 255, 255, 0.05)',
    },
    lightSquare: {
      background: `
        linear-gradient(90deg,
          hsl(40 30% 65%) 0%,
          hsl(40 35% 70%) 25%,
          hsl(40 30% 62%) 50%,
          hsl(40 35% 68%) 75%,
          hsl(40 30% 65%) 100%
        ),
        repeating-linear-gradient(
          0deg,
          transparent 0px,
          rgba(0,0,0,0.02) 1px,
          transparent 2px,
          transparent 4px
        )
      `,
      boxShadow: 'inset 0 2px 4px rgba(255, 255, 255, 0.2), inset 0 -1px 2px rgba(0, 0, 0, 0.05)',
    },
    boardStyle: {
      borderRadius: '8px',
      boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4), 0 0 0 4px hsl(25 40% 18%), 0 0 0 8px hsl(25 30% 12%)',
      border: '2px solid hsl(25 40% 30%)',
      background: 'hsl(25 35% 15%)',
    },
  },

  // 2. MARBLE - Elegant white and gray veined marble
  {
    id: 'marble',
    name: 'Marble',
    darkSquare: {
      background: `
        linear-gradient(125deg,
          hsl(220 5% 35%) 0%,
          hsl(220 8% 40%) 20%,
          hsl(220 5% 32%) 40%,
          hsl(220 10% 45%) 60%,
          hsl(220 5% 38%) 80%,
          hsl(220 8% 35%) 100%
        ),
        radial-gradient(ellipse at 30% 70%, rgba(255,255,255,0.05) 0%, transparent 50%),
        radial-gradient(ellipse at 70% 30%, rgba(0,0,0,0.05) 0%, transparent 50%)
      `,
      boxShadow: 'inset 0 1px 3px rgba(255, 255, 255, 0.1), inset 0 -1px 3px rgba(0, 0, 0, 0.2)',
    },
    lightSquare: {
      background: `
        linear-gradient(125deg,
          hsl(0 0% 92%) 0%,
          hsl(0 0% 88%) 20%,
          hsl(220 5% 95%) 40%,
          hsl(0 0% 90%) 60%,
          hsl(220 3% 93%) 80%,
          hsl(0 0% 91%) 100%
        ),
        radial-gradient(ellipse at 60% 40%, rgba(180,180,200,0.15) 0%, transparent 40%),
        radial-gradient(ellipse at 20% 80%, rgba(150,150,170,0.1) 0%, transparent 30%)
      `,
      boxShadow: 'inset 0 1px 4px rgba(255, 255, 255, 0.5), inset 0 -1px 2px rgba(0, 0, 0, 0.05)',
    },
    boardStyle: {
      borderRadius: '4px',
      boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3), 0 0 0 3px hsl(0 0% 85%), 0 0 0 6px hsl(0 0% 70%)',
      border: '2px solid hsl(0 0% 80%)',
      background: 'linear-gradient(135deg, hsl(0 0% 95%), hsl(0 0% 85%))',
    },
  },

  // 3. BRUSHED METAL - Industrial steel look
  {
    id: 'metal',
    name: 'Brushed Steel',
    darkSquare: {
      background: `
        linear-gradient(90deg,
          hsl(220 10% 25%) 0%,
          hsl(220 10% 30%) 10%,
          hsl(220 10% 22%) 20%,
          hsl(220 10% 28%) 30%,
          hsl(220 10% 24%) 40%,
          hsl(220 10% 30%) 50%,
          hsl(220 10% 23%) 60%,
          hsl(220 10% 27%) 70%,
          hsl(220 10% 25%) 80%,
          hsl(220 10% 29%) 90%,
          hsl(220 10% 25%) 100%
        ),
        repeating-linear-gradient(
          90deg,
          transparent 0px,
          rgba(255,255,255,0.02) 1px,
          transparent 2px
        )
      `,
      boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.1), inset 0 -1px 0 rgba(0, 0, 0, 0.2)',
    },
    lightSquare: {
      background: `
        linear-gradient(90deg,
          hsl(220 5% 55%) 0%,
          hsl(220 5% 60%) 10%,
          hsl(220 5% 52%) 20%,
          hsl(220 5% 58%) 30%,
          hsl(220 5% 54%) 40%,
          hsl(220 5% 62%) 50%,
          hsl(220 5% 53%) 60%,
          hsl(220 5% 57%) 70%,
          hsl(220 5% 55%) 80%,
          hsl(220 5% 59%) 90%,
          hsl(220 5% 55%) 100%
        ),
        repeating-linear-gradient(
          90deg,
          transparent 0px,
          rgba(255,255,255,0.03) 1px,
          transparent 2px
        )
      `,
      boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.15), inset 0 -1px 0 rgba(0, 0, 0, 0.1)',
    },
    boardStyle: {
      borderRadius: '2px',
      boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5), 0 0 0 2px hsl(220 10% 40%), 0 0 0 4px hsl(220 10% 20%)',
      border: '1px solid hsl(220 10% 50%)',
      background: 'linear-gradient(180deg, hsl(220 10% 30%), hsl(220 10% 20%))',
    },
  },

  // 4. GLASS - Frosted transparent look
  {
    id: 'glass',
    name: 'Frosted Glass',
    darkSquare: {
      background: `
        linear-gradient(135deg,
          rgba(60, 80, 120, 0.7) 0%,
          rgba(40, 60, 100, 0.8) 50%,
          rgba(50, 70, 110, 0.7) 100%
        )
      `,
      boxShadow: 'inset 0 1px 2px rgba(255, 255, 255, 0.1), inset 0 -1px 2px rgba(0, 0, 0, 0.2), 0 0 10px rgba(100, 150, 255, 0.1)',
    },
    lightSquare: {
      background: `
        linear-gradient(135deg,
          rgba(200, 220, 255, 0.6) 0%,
          rgba(180, 200, 240, 0.7) 50%,
          rgba(190, 210, 250, 0.6) 100%
        )
      `,
      boxShadow: 'inset 0 1px 3px rgba(255, 255, 255, 0.4), inset 0 -1px 2px rgba(0, 0, 0, 0.1), 0 0 15px rgba(200, 220, 255, 0.2)',
    },
    boardStyle: {
      borderRadius: '16px',
      boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3), 0 0 40px rgba(100, 150, 255, 0.2), inset 0 0 30px rgba(255, 255, 255, 0.1)',
      border: '1px solid rgba(255, 255, 255, 0.3)',
      background: 'linear-gradient(135deg, rgba(100, 150, 200, 0.3), rgba(50, 100, 150, 0.4))',
    },
  },

  // 5. PIXEL / RETRO - 8-bit inspired
  {
    id: 'pixel',
    name: 'Retro Pixel',
    darkSquare: {
      background: `
        linear-gradient(to bottom right,
          hsl(270 60% 25%) 0%,
          hsl(270 60% 20%) 100%
        )
      `,
      boxShadow: 'inset -2px -2px 0 hsl(270 60% 15%), inset 2px 2px 0 hsl(270 60% 35%)',
    },
    lightSquare: {
      background: `
        linear-gradient(to bottom right,
          hsl(180 60% 50%) 0%,
          hsl(180 60% 45%) 100%
        )
      `,
      boxShadow: 'inset -2px -2px 0 hsl(180 60% 35%), inset 2px 2px 0 hsl(180 60% 65%)',
    },
    boardStyle: {
      borderRadius: '0px',
      boxShadow: '8px 8px 0 hsl(270 60% 10%), -4px -4px 0 hsl(180 60% 70%)',
      border: '4px solid hsl(60 80% 50%)',
      background: 'hsl(270 60% 15%)',
    },
  },

  // 6. EMERALD - Rich green tournament style
  {
    id: 'emerald',
    name: 'Emerald Tournament',
    darkSquare: {
      background: `
        linear-gradient(135deg,
          hsl(150 40% 22%) 0%,
          hsl(150 45% 18%) 50%,
          hsl(150 40% 20%) 100%
        )
      `,
      boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.3), inset 0 -1px 2px rgba(100, 200, 150, 0.1)',
    },
    lightSquare: {
      background: `
        linear-gradient(135deg,
          hsl(80 25% 75%) 0%,
          hsl(80 30% 80%) 50%,
          hsl(80 25% 77%) 100%
        )
      `,
      boxShadow: 'inset 0 2px 4px rgba(255, 255, 255, 0.3), inset 0 -1px 2px rgba(0, 0, 0, 0.05)',
    },
    boardStyle: {
      borderRadius: '8px',
      boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4), 0 0 0 4px hsl(150 40% 15%), 0 0 20px rgba(100, 200, 150, 0.2)',
      border: '2px solid hsl(150 40% 25%)',
      background: 'hsl(150 40% 12%)',
    },
  },

  // 7. OBSIDIAN - Dark volcanic glass
  {
    id: 'obsidian',
    name: 'Obsidian',
    darkSquare: {
      background: `
        linear-gradient(135deg,
          hsl(260 20% 8%) 0%,
          hsl(260 25% 12%) 30%,
          hsl(260 20% 6%) 60%,
          hsl(260 30% 15%) 100%
        ),
        radial-gradient(ellipse at 30% 30%, rgba(100, 80, 150, 0.15) 0%, transparent 50%)
      `,
      boxShadow: 'inset 0 1px 3px rgba(150, 100, 200, 0.1), inset 0 -1px 3px rgba(0, 0, 0, 0.5)',
    },
    lightSquare: {
      background: `
        linear-gradient(135deg,
          hsl(260 15% 25%) 0%,
          hsl(260 20% 30%) 30%,
          hsl(260 15% 22%) 60%,
          hsl(260 25% 32%) 100%
        ),
        radial-gradient(ellipse at 70% 70%, rgba(150, 120, 200, 0.1) 0%, transparent 50%)
      `,
      boxShadow: 'inset 0 1px 4px rgba(200, 150, 255, 0.1), inset 0 -1px 2px rgba(0, 0, 0, 0.3)',
    },
    boardStyle: {
      borderRadius: '12px',
      boxShadow: '0 25px 50px rgba(0, 0, 0, 0.6), 0 0 60px rgba(100, 50, 150, 0.2), inset 0 0 20px rgba(150, 100, 200, 0.05)',
      border: '2px solid hsl(260 30% 20%)',
      background: 'linear-gradient(135deg, hsl(260 20% 5%), hsl(260 25% 10%))',
    },
  },

  // 8. ROSEWOOD - Luxury reddish wood
  {
    id: 'rosewood',
    name: 'Rosewood',
    darkSquare: {
      background: `
        linear-gradient(90deg,
          hsl(0 35% 20%) 0%,
          hsl(350 40% 22%) 25%,
          hsl(5 35% 18%) 50%,
          hsl(355 40% 24%) 75%,
          hsl(0 35% 20%) 100%
        ),
        repeating-linear-gradient(
          0deg,
          transparent 0px,
          rgba(0,0,0,0.04) 1px,
          transparent 2px,
          transparent 5px
        )
      `,
      boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.35), inset 0 -1px 2px rgba(255, 200, 200, 0.05)',
    },
    lightSquare: {
      background: `
        linear-gradient(90deg,
          hsl(35 40% 70%) 0%,
          hsl(30 45% 75%) 25%,
          hsl(40 40% 68%) 50%,
          hsl(35 45% 72%) 75%,
          hsl(35 40% 70%) 100%
        ),
        repeating-linear-gradient(
          0deg,
          transparent 0px,
          rgba(0,0,0,0.02) 1px,
          transparent 2px,
          transparent 5px
        )
      `,
      boxShadow: 'inset 0 2px 4px rgba(255, 255, 255, 0.25), inset 0 -1px 2px rgba(0, 0, 0, 0.08)',
    },
    boardStyle: {
      borderRadius: '6px',
      boxShadow: '0 20px 40px rgba(0, 0, 0, 0.45), 0 0 0 4px hsl(0 35% 15%), 0 0 0 8px hsl(0 30% 10%)',
      border: '2px solid hsl(0 35% 25%)',
      background: 'hsl(0 35% 12%)',
    },
  },
];

// Get a random theme
export function getRandomTheme(): BoardTheme {
  const randomIndex = Math.floor(Math.random() * boardThemes.length);
  return boardThemes[randomIndex];
}

// Get theme by ID
export function getThemeById(id: string): BoardTheme | undefined {
  return boardThemes.find(theme => theme.id === id);
}

// Get next theme (for cycling)
export function getNextTheme(currentId: string): BoardTheme {
  const currentIndex = boardThemes.findIndex(theme => theme.id === currentId);
  const nextIndex = (currentIndex + 1) % boardThemes.length;
  return boardThemes[nextIndex];
}

// Default theme
export const defaultTheme = boardThemes[0];
