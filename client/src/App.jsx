import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/common/Navbar/Navbar';
import { Footer } from './components/common/Footer/Footer';
import { AppRoutes } from './routes/AppRoutes';
import { useHealthCheck } from './hooks/useHealthCheck';

export function App() {
  const healthState = useHealthCheck(30000);

  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <Navbar />
            <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
              <AppRoutes healthState={healthState} />
            </div>
            <Footer />
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
