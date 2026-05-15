# ✅ Profile Settings - Manual Test Checklist

## 🎯 Pre-Test Setup
- [ ] Frontend dev server running (`npm start`)
- [ ] Backend server running (port 5000)
- [ ] Database connected
- [ ] User logged in with valid credentials
- [ ] Browser DevTools open (F12)

---

## 🖼️ Avatar Uploader Tests

### Upload Functionality
- [ ] Drag & drop image onto upload area highlights correctly
- [ ] Click on upload area opens file picker
- [ ] Selected image shows preview immediately
- [ ] Image formats accepted: JPEG, PNG, WebP, GIF
- [ ] File size validation works (max 5MB)
- [ ] Invalid format shows error toast
- [ ] File too large shows error toast

### Image Processing
- [ ] Large images compressed automatically
- [ ] Preview updates in real-time
- [ ] Compressed image quality acceptable
- [ ] Avatar updates in preview panel

### Image Removal
- [ ] "Rimuovi" button visible when image selected
- [ ] Clicking "Rimuovi" removes image and resets preview
- [ ] File input cleared after removal

---

## 👤 Username Editor Tests

### Validation
- [ ] Username accepts letters, numbers, underscore, dash
- [ ] Username rejects special characters (@, #, !, etc.)
- [ ] Minimum 3 characters enforced
- [ ] Maximum 30 characters enforced
- [ ] Empty username shows validation message
- [ ] Character counter updates correctly

### Availability Check
- [ ] Spinning loader appears during check
- [ ] Check completes within reasonable time (~1 second)
- [ ] Green checkmark for available username
- [ ] Red X for taken username
- [ ] Reserved usernames rejected (admin, root, etc.)
- [ ] Message displays availability status

### Reserved Usernames
- [ ] "admin" shows "reserved" error
- [ ] "root" shows "reserved" error
- [ ] "system" shows "reserved" error

---

## 📝 Biography Editor Tests

### Input Handling
- [ ] Bio accepts all text input
- [ ] Bio accepts emoji characters
- [ ] Newlines work in biography
- [ ] Max 200 characters enforced
- [ ] Input field expands on focus

### Character Counter
- [ ] Counter shows remaining characters
- [ ] Color changes: green (50+), yellow (20-50), red (<20)
- [ ] Progress bar animates as typing
- [ ] Counter accurate at all times
- [ ] Preview updates in real-time

### Preview
- [ ] Preview box shows bio text live
- [ ] Placeholder shown when empty
- [ ] Formatting preserved (line breaks, etc.)

---

## 🎨 Frame Selector Tests

### Frame Selection
- [ ] All 6 frames display correctly:
  - [ ] Neon (cyan glow)
  - [ ] Gold (yellow/orange)
  - [ ] Minimal (clean white/gray)
  - [ ] Cyberpunk (pink/purple)
  - [ ] RGB (multicolor)
  - [ ] None (no frame)
- [ ] Clicking frame selects it
- [ ] Selected frame highlighted with cyan border
- [ ] Only one frame selected at a time

### Frame Preview
- [ ] Avatar in preview shows selected frame
- [ ] Frame effects visible (glow, border color)
- [ ] Preview updates immediately
- [ ] Animated effects working smoothly

### Frame Effects
- [ ] Premium frames have glow/shadow
- [ ] Neon frame has cyan glow
- [ ] Gold frame has yellow glow
- [ ] Cyberpunk frame has pink glow

---

## 📸 Profile Preview Tests

### Layout
- [ ] Preview sticky on desktop (stays visible while scrolling)
- [ ] Preview full-width on mobile
- [ ] Preview card styled correctly (dark theme)
- [ ] All sections visible (avatar, username, bio, stats, buttons)

### Content Updates
- [ ] Avatar updates immediately
- [ ] Username updates immediately
- [ ] Bio updates immediately
- [ ] Frame applied immediately
- [ ] All changes synced with live preview

### Styling
- [ ] Avatar shows selected frame styling
- [ ] Frame color applies to avatar border
- [ ] Glow effects visible
- [ ] Stats display formatted correctly
- [ ] Action buttons (Segui, Chat, Condividi) clickable

---

## 💾 Save & Cancel Tests

### Save Functionality
- [ ] "Salva Modifiche" button enabled only with changes
- [ ] Button shows loading state during save
- [ ] Success toast shows after save
- [ ] Profile updates in backend (verify in DB)
- [ ] Changed data persists after page reload

### Cancel Functionality
- [ ] "Annulla" button enabled only with changes
- [ ] Clicking "Annulla" reverts all changes
- [ ] Info toast shows "Modifiche annullate"
- [ ] Preview reverts to previous state
- [ ] Form fields reset to last saved values

### Disabled States
- [ ] Save/Cancel buttons disabled without changes
- [ ] Buttons disabled during network request
- [ ] "Loading..." text shows appropriately

---

## 🔔 Toast Notifications Tests

### Success Toasts
- [ ] "Profilo aggiornato con successo!" appears on save
- [ ] Green checkmark icon shows
- [ ] Auto-dismisses after 4 seconds
- [ ] Manual close button works

### Error Toasts
- [ ] Invalid file shows error toast
- [ ] File too large shows error
- [ ] Invalid username shows warning
- [ ] Red icon for errors
- [ ] Error message clear and helpful

### Positioning
- [ ] Toasts appear bottom-right
- [ ] Multiple toasts stack
- [ ] Toasts don't overlap with content

---

## 🎬 Animation & UX Tests

### Smooth Animations
- [ ] Page transitions smooth
- [ ] Component reveals animated
- [ ] Button hovers smooth
- [ ] Loading spinner smooth
- [ ] Toast slide-in smooth

### Hover Effects
- [ ] Buttons scale on hover
- [ ] Links change color on hover
- [ ] Input fields highlight on focus
- [ ] Cards have subtle glow on hover (desktop)

### Responsive Behavior
- [ ] Layout switches to 1 column on tablet
- [ ] Layout switches to 1 column on mobile
- [ ] Preview repositions correctly
- [ ] All text readable on mobile
- [ ] Buttons touch-friendly (44px min)

---

## 📱 Responsive Design Tests

### Desktop (1024px+)
- [ ] 2-column layout (form + preview)
- [ ] Preview sticky on scroll
- [ ] All elements visible without scrolling (initially)

### Tablet (768px)
- [ ] Layout switches to 1 column
- [ ] Preview below form
- [ ] All buttons sized correctly
- [ ] No horizontal scroll

### Mobile (375px)
- [ ] Single column layout
- [ ] Avatar upload area compressed
- [ ] Buttons full width
- [ ] Text readable
- [ ] No overflow
- [ ] Touch targets adequate

---

## 🔐 Security Tests

### Input Validation
- [ ] HTML special chars escaped
- [ ] Script tags in bio rejected
- [ ] XSS attempts blocked
- [ ] SQL injection attempts blocked

### File Upload
- [ ] File validation before upload
- [ ] MIME type checked
- [ ] File size validated
- [ ] Malicious files rejected

---

## 🌙 Dark Mode Tests

- [ ] All text readable on dark background
- [ ] Colors have adequate contrast
- [ ] Images visible against background
- [ ] Borders visible
- [ ] Hover states clear
- [ ] Form inputs styled correctly
- [ ] Buttons visible and clickable

---

## 🌐 Browser Compatibility

- [ ] Chrome/Edge latest ✅
- [ ] Firefox latest ✅
- [ ] Safari latest ✅
- [ ] Mobile browsers ✅

---

## 🐛 Error Handling Tests

### Network Errors
- [ ] Handle slow network gracefully
- [ ] Handle timeout errors
- [ ] Show retry option
- [ ] Error messages helpful

### Edge Cases
- [ ] Empty profile update
- [ ] Very long username (50+ chars)
- [ ] Very long bio (500+ chars)
- [ ] Rapid clicking save button
- [ ] Page close during upload

---

## 📊 Performance Tests

- [ ] Page load time < 2s
- [ ] Avatar preview instant
- [ ] Validation checks responsive (<500ms)
- [ ] Save operation completes within 2s
- [ ] No console errors
- [ ] No memory leaks on navigation

---

## ✨ Accessibility Tests

- [ ] Tab navigation works
- [ ] Focus states visible
- [ ] Labels associated with inputs
- [ ] Error messages announced
- [ ] Color not only differentiator
- [ ] Images have alt text
- [ ] Keyboard shortcuts work

---

## 🎯 Feature Completeness

### All Requirements Met
- [x] Upload immagine profilo con preview
- [x] Rimuovere/sostituire immagine
- [x] Validazione file immagine
- [x] Campo username validazione live
- [x] Controllo disponibilità username
- [x] Campo biografia limite 200 char
- [x] Counter live caratteri
- [x] Sistema selezione cornice
- [x] Anteprima live cornice
- [x] Cornici predefinite (6 stili)
- [x] Pulsante Salva Modifiche
- [x] Pulsante Annulla
- [x] Design moderno dark mode
- [x] Responsive mobile/desktop
- [x] Animazioni fluide
- [x] Toast notifications
- [x] Preview profilo aggiornato

---

## 🏁 Final Sign-Off

**Test Date**: _________________

**Tester Name**: _________________

**All Tests Passed**: [ ] YES [ ] NO

**Issues Found**: 
```
1. 
2. 
3. 
```

**Notes**:
```
_____________________________________
_____________________________________
_____________________________________
```

**Ready for Production**: [ ] YES [ ] NO

---

**Remember**: Always clear browser cache and hard-refresh (Ctrl+Shift+R) before testing!
