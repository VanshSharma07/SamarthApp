import React, { useState, useEffect } from 'react';
import { 
  Box, 
  AppBar, 
  Toolbar, 
  Typography, 
  IconButton, 
  Avatar, 
  Menu, 
  MenuItem,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  useTheme,
  Button,
  Badge,
  Tooltip,
  Paper,
  Fade,
  useMediaQuery,
  Chip
} from '@mui/material';
import { 
  Menu as MenuIcon, 
  Notifications, 
  Settings,
  Dashboard as DashboardIcon,
  Assessment,
  Analytics,
  Person,
  ExitToApp,
  ChevronRight,
  BugReport as BugReportIcon,
  HealthAndSafety as HealthIcon,
  Healing as HealingIcon,
  Search as SearchIcon,
  Close as CloseIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

// Add avatar options - should be the same as in Profile.jsx
// This could be moved to a shared config file in the future
const avatarOptions = [
  { id: 'default', url: '/avatars/default.png', name: 'Default' },
  { id: 'avatar1', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Felix', name: 'Robot 1' },
  { id: 'avatar2', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Aneka', name: 'Robot 2' },
  { id: 'avatar3', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Midnight', name: 'Person 1' },
  { id: 'avatar4', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Luna', name: 'Person 2' },
  { id: 'avatar5', url: 'https://api.dicebear.com/7.x/micah/svg?seed=Felix', name: 'Minimal 1' },
  { id: 'avatar6', url: 'https://api.dicebear.com/7.x/micah/svg?seed=Coco', name: 'Minimal 2' },
  { id: 'avatar7', url: 'https://api.dicebear.com/7.x/thumbs/svg?seed=Daisy', name: 'Thumb 1' },
  { id: 'avatar8', url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Pepper', name: 'Portrait 1' }
];

// Motion components
const MotionAppBar = motion(AppBar);
const MotionBox = motion(Box);

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // State for menus
  const [profileMenu, setProfileMenu] = useState(null);
  const [notificationMenu, setNotificationMenu] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [userAvatar, setUserAvatar] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);

  // New useEffect to fetch avatar from localStorage
  useEffect(() => {
    if (user?.id) {
      // First check localStorage for avatar URL
      const savedAvatarUrl = localStorage.getItem(`avatarUrl_${user.id}`);
      
      if (savedAvatarUrl) {
        setUserAvatar(savedAvatarUrl);
      } else {
        // If no URL directly saved, check for avatar ID
        const savedAvatarId = localStorage.getItem(`avatar_${user.id}`);
        if (savedAvatarId) {
          const avatarObj = avatarOptions.find(a => a.id === savedAvatarId);
          setUserAvatar(avatarObj?.url || '');
        } else {
          // Fall back to user's profile pic if available
          setUserAvatar(user?.profilePic || user?.profile?.avatarUrl || '');
        }
      }
    } else {
      setUserAvatar('');
    }
  }, [user]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out:', error);
    }
  };

  // Get current section for active nav highlighting
  const getCurrentSection = () => {
    const path = location.pathname;
    if (path.includes('/dashboard')) return 'dashboard';
    if (path.includes('/assessment')) return 'assessments';
    if (path.includes('/analytics')) return 'analytics';
    if (path.includes('/therapies')) return 'therapies';
    if (path.includes('/settings')) return 'settings';
    if (path.includes('/diagnostics')) return 'diagnostics';
    if (path.includes('/profile')) return 'profile';
    return '';
  };

  const currentSection = getCurrentSection();

  const menuItems = [
    { id: 'dashboard', text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
    { id: 'assessments', text: 'Assessments', icon: <Assessment />, path: '/assessment' },
    { id: 'analytics', text: 'Analytics', icon: <Analytics />, path: '/analytics' },
    { id: 'therapies', text: 'Therapies', icon: <HealingIcon />, path: '/therapies' },
    { id: 'settings', text: 'Settings', icon: <Settings />, path: '/settings' },
  ];

  // Add diagnostics link only in development mode
  if (import.meta.env.DEV) {
    menuItems.push({
      id: 'diagnostics',
      text: 'Diagnostics',
      icon: <BugReportIcon />,
      path: '/diagnostics'
    });
  }

  // Sample notifications (could be fetched from an API in a real app)
  const notifications = [
    { id: 1, type: 'assessment', message: 'Time for your daily assessment', time: '10 minutes ago', read: false },
    { id: 2, type: 'therapy', message: 'New therapy session available', time: '2 hours ago', read: false },
    { id: 3, type: 'progress', message: 'Weekly progress report is ready', time: 'Yesterday', read: true },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <MotionAppBar 
        position="fixed" 
        initial={{ y: -70 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
        sx={{ 
          zIndex: theme.zIndex.drawer + 1,
          boxShadow: 'none',
          backdropFilter: 'blur(20px)',
          // Use theme-based background color with transparency
          background: theme.palette.mode === 'dark' 
            ? 'rgba(18, 18, 18, 0.9)'  // Dark mode background
            : 'rgba(255, 255, 255, 0.9)', // Light mode background
          borderBottom: `1px solid ${theme.palette.divider}`, // Use theme divider color
        }}
        elevation={0}
      >
        <Toolbar sx={{ px: { xs: 1, sm: 2, md: 3 } }}>
          <IconButton
            size="large"
            edge="start"
            aria-label="menu"
            onClick={() => setDrawerOpen(true)}
            sx={{ 
              mr: 2,
              color: theme.palette.primary.main
            }}
          >
            <MenuIcon />
          </IconButton>
          
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              flexGrow: 1, 
              cursor: 'pointer',
              '&:hover': {
                opacity: 0.8
              }
            }}
            onClick={() => navigate('/dashboard')}
          >
            {/* Use a conditional logo based on theme mode */}
            <Box 
              component="img"
              // If you have a dark mode logo version, use it. Otherwise, keep the same logo
              src="/images/loogo.png"
              alt="Samarth Logo"
              sx={{ 
                height: 60,
                mr: 1.5,
                // Optional filter for dark mode if you don't have a separate logo file
                filter: theme.palette.mode === 'dark' ? 'brightness(1.2) contrast(1.1)' : 'none',
              }}
            />
          </Box>

          {/* Nav Links for larger screens */}
          {!isMobile && (
            <Box sx={{ display: 'flex', mx: 2 }}>
              {menuItems.slice(0, 4).map((item) => (
                <Button
                  key={item.id}
                  onClick={() => navigate(item.path)}
                  sx={{
                    mx: 0.5,
                    px: 2,
                    color: currentSection === item.id ? theme.palette.primary.main : 'text.secondary',
                    position: 'relative',
                    '&:hover': {
                      backgroundColor: 'transparent',
                      color: theme.palette.primary.main
                    },
                    fontWeight: currentSection === item.id ? 600 : 400,
                    textTransform: 'none',
                    fontSize: '0.95rem'
                  }}
                >
                  {item.text}
                  {currentSection === item.id && (
                    <Box
                      sx={{
                        position: 'absolute',
                        bottom: 5,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: 24,
                        height: 3,
                        borderRadius: 3,
                        bgcolor: theme.palette.primary.main
                      }}
                    />
                  )}
                </Button>
              ))}
            </Box>
          )}

          {/* Search Button */}
          <IconButton 
            color="inherit"
            onClick={() => setSearchOpen(!searchOpen)}
            sx={{ 
              color: 'text.secondary',
              mx: 0.5,
              '&:hover': { 
                color: theme.palette.primary.main,
                background: 'rgba(33, 150, 243, 0.08)'
              }
            }}
          >
            <SearchIcon />
          </IconButton>

          {/* Notification Button with Badge */}
          <IconButton 
            color="inherit"
            onClick={(e) => setNotificationMenu(e.currentTarget)}
            sx={{ 
              mx: 0.5,
              color: 'text.secondary',
              '&:hover': { 
                color: theme.palette.primary.main,
                background: 'rgba(33, 150, 243, 0.08)'
              }
            }}
          >
            <Badge 
              badgeContent={notifications.filter(n => !n.read).length} 
              color="error"
              sx={{
                '& .MuiBadge-badge': {
                  top: 5,
                  right: 5
                }
              }}
            >
              <Notifications />
            </Badge>
          </IconButton>

          {/* Avatar Button with Outline Effect */}
          <Tooltip title="Account & Profile">
            <IconButton 
              onClick={(e) => setProfileMenu(e.currentTarget)}
              sx={{ 
                ml: 1,
                p: 0.5,
                bgcolor: 'background.paper',
                '&:hover': { 
                  bgcolor: 'rgba(33, 150, 243, 0.08)'
                }
              }}
            >
              <Avatar 
                sx={{ 
                  width: 38, 
                  height: 38,
                  border: currentSection === 'profile' 
                    ? `2px solid ${theme.palette.primary.main}` 
                    : '2px solid transparent',
                  transition: 'border 0.3s ease'
                }}
                alt={user?.name || 'User'} 
                src={userAvatar || user?.profilePic}
              >
                {user?.name?.[0] || user?.email?.[0] || 'U'}
              </Avatar>
            </IconButton>
          </Tooltip>

          {/* Profile Menu */}
          <Menu
            anchorEl={profileMenu}
            open={Boolean(profileMenu)}
            onClose={() => setProfileMenu(null)}
            TransitionComponent={Fade}
            PaperProps={{
              elevation: 3,
              sx: {
                mt: 1.5,
                ml: 0.5,
                minWidth: 220,
                borderRadius: 2,
                overflow: 'hidden'
              }
            }}
          >
            <Box 
              sx={{ 
                px: 2, 
                py: 2, 
                background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                color: 'white',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <Avatar 
                sx={{ 
                  width: 40, 
                  height: 40,
                  border: '2px solid white',
                  mr: 1.5
                }}
                src={userAvatar || user?.profilePic}
              >
                {user?.name?.[0] || user?.email?.[0] || 'U'}
              </Avatar>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', lineHeight: 1.2 }}>
                  {user?.name || 'User'}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9, fontSize: '0.8rem' }}>
                  {user?.email || 'user@example.com'}
                </Typography>
              </Box>
            </Box>
            
            <Box sx={{ px: 1, py: 1 }}>
              <MenuItem onClick={() => {
                navigate('/profile');
                setProfileMenu(null);
              }} sx={{ borderRadius: 1 }}>
                <ListItemIcon>
                  <Person fontSize="small" sx={{ color: theme.palette.primary.main }} />
                </ListItemIcon>
                <ListItemText primary="Your Profile" />
              </MenuItem>
              
              <MenuItem onClick={() => {
                navigate('/settings');
                setProfileMenu(null);
              }} sx={{ borderRadius: 1 }}>
                <ListItemIcon>
                  <Settings fontSize="small" sx={{ color: theme.palette.primary.main }} />
                </ListItemIcon>
                <ListItemText primary="Settings" />
              </MenuItem>
              
              <Divider sx={{ my: 1 }} />
              
              <MenuItem onClick={() => {
                handleLogout();
                setProfileMenu(null);
              }} sx={{ borderRadius: 1 }}>
                <ListItemIcon>
                  <ExitToApp fontSize="small" color="error" />
                </ListItemIcon>
                <ListItemText 
                  primary="Logout" 
                  primaryTypographyProps={{ color: 'error' }}
                />
              </MenuItem>
            </Box>
          </Menu>

          {/* Notifications Menu */}
          <Menu
            anchorEl={notificationMenu}
            open={Boolean(notificationMenu)}
            onClose={() => setNotificationMenu(null)}
            TransitionComponent={Fade}
            PaperProps={{
              elevation: 3,
              sx: {
                mt: 1.5,
                minWidth: 320,
                maxWidth: 320,
                borderRadius: 2,
                overflow: 'hidden'
              }
            }}
          >
            <Box sx={{ 
              px: 2, 
              py: 1.5, 
              borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                Notifications
              </Typography>
              <Button 
                variant="text" 
                size="small" 
                color="primary"
                sx={{ textTransform: 'none', fontWeight: 500 }}
              >
                Mark All as Read
              </Button>
            </Box>
            
            <Box sx={{ maxHeight: 350, overflowY: 'auto' }}>
              {notifications.length === 0 ? (
                <Box sx={{ p: 3, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    No notifications yet
                  </Typography>
                </Box>
              ) : (
                notifications.map((notification) => (
                  <MenuItem 
                    key={notification.id}
                    onClick={() => {
                      // Handle notification click
                      setNotificationMenu(null);
                    }}
                    sx={{ 
                      py: 1.5, 
                      px: 2,
                      borderLeft: notification.read ? 'none' : `3px solid ${theme.palette.primary.main}`,
                      bgcolor: notification.read ? 'transparent' : 'rgba(33, 150, 243, 0.04)',
                      '&:hover': {
                        bgcolor: 'rgba(0, 0, 0, 0.04)'
                      }
                    }}
                  >
                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            fontWeight: notification.read ? 400 : 600,
                            color: 'text.primary',
                            mr: 1
                          }}
                        >
                          {notification.message}
                        </Typography>
                        
                        {!notification.read && (
                          <Chip 
                            label="New" 
                            size="small"
                            color="primary"
                            sx={{ 
                              height: 20, 
                              fontSize: '0.7rem',
                              fontWeight: 'bold'
                            }}
                          />
                        )}
                      </Box>
                      
                      <Typography 
                        variant="caption" 
                        color="text.secondary"
                      >
                        {notification.time}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))
              )}
            </Box>
            
            <Box sx={{ 
              p: 1.5,
              borderTop: '1px solid rgba(0, 0, 0, 0.08)',
              textAlign: 'center'
            }}>
              <Button 
                variant="text" 
                fullWidth
                color="primary"
                size="small"
                onClick={() => {
                  navigate('/notifications');
                  setNotificationMenu(null);
                }}
                sx={{ textTransform: 'none', fontWeight: 500 }}
              >
                View All Notifications
              </Button>
            </Box>
          </Menu>
        </Toolbar>

        {/* Search Bar */}
        <Fade in={searchOpen}>
          <Box 
            sx={{ 
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              bgcolor: theme.palette.background.paper, // Use theme paper background
              zIndex: theme.zIndex.drawer + 2,
              display: searchOpen ? 'flex' : 'none',
              alignItems: 'center',
              px: 2,
              // Add subtle border for separation in dark mode
              borderBottom: theme.palette.mode === 'dark' 
                ? `1px solid ${theme.palette.divider}` 
                : 'none',
            }}
          >
            <IconButton 
              onClick={() => setSearchOpen(false)}
              color="inherit"
              sx={{ color: theme.palette.text.secondary }}
            >
              <ArrowBackIcon />
            </IconButton>
            
            <Box 
              component="input"
              placeholder="Search for assessments, therapies, etc."
              sx={{
                border: 'none',
                outline: 'none',
                width: '100%',
                height: '100%',
                p: 2,
                fontSize: '1rem',
                bgcolor: 'transparent',
                color: theme.palette.text.primary
              }}
              autoFocus
            />
            
            <IconButton 
              onClick={() => setSearchOpen(false)}
              color="inherit"
              sx={{ color: theme.palette.text.secondary }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </Fade>
      </MotionAppBar>

      {/* Sidebar Drawer */}
      <Drawer
        variant="temporary"
        anchor="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        sx={{
          '& .MuiDrawer-paper': {
            width: 290,
            boxSizing: 'border-box',
            background: theme.palette.background.default, // Already using theme color
            boxShadow: theme.palette.mode === 'dark' 
              ? '0 0 20px rgba(0,0,0,0.5)'  // Stronger shadow for dark mode
              : '0 0 20px rgba(0,0,0,0.05)', // Subtle shadow for light mode
            borderRight: 'none',
          },
        }}
      >
        <Box sx={{ 
          height: 65, 
          display: 'flex', 
          alignItems: 'center', 
          px: 2,
          borderBottom: `1px solid ${theme.palette.divider}`, // Use theme divider color
          mb: 1
        }}>
          <IconButton onClick={() => setDrawerOpen(false)}>
            <CloseIcon />
          </IconButton>
          
          <Box sx={{ ml: 1, display: 'flex', alignItems: 'center' }}>
            <Box 
              component="img"
              src="/images/loogo.png"
              alt="Samarth Logo"
              sx={{ 
                height: 60,
                mr: 1,
                filter: theme.palette.mode === 'dark' ? 'brightness(1.2) contrast(1.1)' : 'none',
              }}
            />
            <Typography variant="h6" fontWeight="bold" color="primary">
              Samarth App
            </Typography>
          </Box>
        </Box>

        {/* User Profile Section - Make background color theme aware */}
        <Box 
          sx={{ 
            p: 2,
            mb: 2,
            display: 'flex',
            alignItems: 'center',
            bgcolor: theme.palette.mode === 'dark' 
              ? 'rgba(33, 150, 243, 0.15)'  // Slightly brighter in dark mode
              : 'rgba(33, 150, 243, 0.05)', // Original color in light mode
            borderRadius: 3,
            mx: 2
          }}
        >
          <Avatar 
            sx={{ 
              width: 50, 
              height: 50,
              border: `2px solid ${theme.palette.primary.main}`
            }}
            src={userAvatar || user?.profilePic}
          >
            {user?.name?.[0] || user?.email?.[0] || 'U'}
          </Avatar>
          
          <Box sx={{ ml: 2 }}>
            <Typography variant="subtitle1" fontWeight="bold">
              {user?.name || 'User'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
              {user?.email || 'user@example.com'}
            </Typography>
          </Box>
        </Box>

        <List sx={{ px: 1.5 }}>
          {menuItems.map((item) => (
            <ListItem 
              button 
              key={item.id}
              onClick={() => {
                navigate(item.path);
                setDrawerOpen(false);
              }}
              sx={{
                borderRadius: 2,
                mb: 0.5,
                backgroundColor: currentSection === item.id 
                  ? 'rgba(33, 150, 243, 0.1)' 
                  : 'transparent',
                '&:hover': {
                  backgroundColor: 'rgba(33, 150, 243, 0.08)',
                },
                position: 'relative',
                pl: currentSection === item.id ? 4 : 3,
                transition: 'padding 0.3s ease',
              }}
            >
              {currentSection === item.id && (
                <Box 
                  sx={{ 
                    position: 'absolute',
                    left: 0,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 3,
                    height: '70%',
                    bgcolor: theme.palette.primary.main,
                    borderRadius: '0 4px 4px 0'
                  }}
                />
              )}
              <ListItemIcon sx={{ 
                color: currentSection === item.id 
                  ? theme.palette.primary.main 
                  : theme.palette.text.secondary,
                minWidth: 36
              }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText 
                primary={item.text} 
                primaryTypographyProps={{ 
                  fontWeight: currentSection === item.id ? 600 : 400,
                  color: currentSection === item.id 
                    ? theme.palette.primary.main 
                    : theme.palette.text.primary
                }}
              />
              {currentSection === item.id && (
                <ChevronRight color="primary" fontSize="small" />
              )}
            </ListItem>
          ))}
        </List>
        
        <Divider sx={{ my: 2 }} />
        
        {/* Bottom section with logout */}
        <Box sx={{ p: 2 }}>
          <Button
            variant="outlined"
            color="error"
            startIcon={<ExitToApp />}
            fullWidth
            onClick={() => {
              handleLogout();
              setDrawerOpen(false);
            }}
            sx={{
              justifyContent: 'flex-start',
              textTransform: 'none',
              fontWeight: 500,
              borderRadius: 2
            }}
          >
            Logout
          </Button>
        </Box>
      </Drawer>

      {/* Main Content */}
      <MotionBox 
        component="main" 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        sx={{ 
          flexGrow: 1, 
          p: { xs: 1, sm: 2, md: 3 }, 
          mt: 8,
          backgroundColor: theme.palette.background.default, // Already using theme color
          minHeight: '100vh'
        }}
      >
        {children}
      </MotionBox>
    </Box>
  );
};

export default Layout;