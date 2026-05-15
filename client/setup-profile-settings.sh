#!/bin/bash

# Profile Settings Page - Setup & Deployment Script
# Script per configurare e deployare la pagina Profile Settings

set -e

echo "================================"
echo "Profile Settings - Setup Script"
echo "================================"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Install Dependencies
echo -e "${BLUE}[1/5]${NC} Installing dependencies..."
cd /workspaces/iAnime/client
npm install framer-motion lucide-react

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Dependencies installed${NC}"
else
    echo -e "${YELLOW}⚠ Some dependencies may need manual installation${NC}"
fi

# 2. Verify TypeScript Setup
echo -e "${BLUE}[2/5]${NC} Verifying TypeScript..."
if [ -f "tsconfig.json" ]; then
    echo -e "${GREEN}✓ TypeScript already configured${NC}"
else
    echo -e "${YELLOW}⚠ TypeScript may need configuration${NC}"
fi

# 3. Verify TailwindCSS Setup
echo -e "${BLUE}[3/5]${NC} Verifying TailwindCSS..."
if [ -f "tailwind.config.js" ] && [ -f "postcss.config.js" ]; then
    echo -e "${GREEN}✓ TailwindCSS configured${NC}"
else
    echo -e "${YELLOW}⚠ TailwindCSS configuration may need attention${NC}"
fi

# 4. Check file structure
echo -e "${BLUE}[4/5]${NC} Checking file structure..."
REQUIRED_FILES=(
    "src/components/ProfileSettings.tsx"
    "src/components/ProfileSettingsWrapper.tsx"
    "src/components/profile/AvatarUploader.tsx"
    "src/components/profile/UsernameEditor.tsx"
    "src/components/profile/BiographyEditor.tsx"
    "src/components/profile/FrameSelector.tsx"
    "src/components/profile/ProfilePreview.tsx"
    "src/components/common/Toast.tsx"
    "src/hooks/useProfileSettings.ts"
    "src/hooks/useLocalStorage.ts"
    "src/hooks/useDropdown.ts"
    "src/constants/profileConstants.ts"
)

ALL_EXIST=true
for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "  ${GREEN}✓${NC} $file"
    else
        echo -e "  ${YELLOW}✗${NC} $file (missing)"
        ALL_EXIST=false
    fi
done

if [ "$ALL_EXIST" = true ]; then
    echo -e "${GREEN}✓ All required files present${NC}"
fi

# 5. Build Summary
echo -e "${BLUE}[5/5]${NC} Build Summary..."
echo ""
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}Profile Settings Setup Complete!${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo "📝 Next Steps:"
echo "  1. Run development server:"
echo "     npm start"
echo ""
echo "  2. Open browser:"
echo "     http://localhost:3000"
echo ""
echo "  3. Login with your credentials"
echo ""
echo "  4. Click on username in navbar (top-right)"
echo ""
echo "  5. Enjoy the Profile Settings page!"
echo ""
echo "📚 Documentation:"
echo "  - Full Guide: docs/PROFILE_SETTINGS_GUIDE.md"
echo "  - Quick Start: PROFILE_SETTINGS_README.md"
echo ""
echo "🔧 Useful Commands:"
echo "  npm start              - Start dev server"
echo "  npm run build          - Production build"
echo "  npm test               - Run tests"
echo "  npm run lint           - Lint code"
echo ""
echo "🐛 Troubleshooting:"
echo "  - If TypeScript errors, run: npm install -D typescript"
echo "  - If Tailwind not loading, run: npm rebuild tailwindcss"
echo "  - If animations lag, check framer-motion version"
echo ""
