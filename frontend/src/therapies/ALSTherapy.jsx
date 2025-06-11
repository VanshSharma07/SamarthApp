import React from 'react';
import { Navigate } from 'react-router-dom';
import ALSTherapyLanding from './als/ALSTherapyLanding';

const ALSTherapy = () => {
  // Redirect to the dedicated ALS therapy landing component
  return <ALSTherapyLanding />;
};

export default ALSTherapy;
