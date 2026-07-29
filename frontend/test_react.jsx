import React from 'react';
import { renderToString } from 'react-dom/server';
import SettingsPage from './src/components/SettingsPage.jsx';

try {
  // We need to mock Supabase and some icons for SettingsPage
  // However, it might be simpler to just find the bug by looking at the component...
} catch(e) {
  console.log(e);
}
