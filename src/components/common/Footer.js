import React from 'react';
import { FaMapMarkerAlt, FaPhone, FaEnvelope, FaGraduationCap, FaCalendarAlt, FaCopyright, FaBuilding } from 'react-icons/fa';
import './Footer.css';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="site-footer">
      <div className="footer-container">
        <div className="footer-section about">
          <h3><FaGraduationCap className="footer-icon" /> Adhyayan Classes</h3>
          <p className="footer-tagline">The surely best academic institute near you</p>
          <p className="footer-since">Serving nation by producing morally and intellectually sharp minds</p>
          <p className="footer-since">Since 2023</p>
        </div>
        
        <div className="footer-section contact">
          <h3>Our Branches</h3>
          <div className="branch-info">
            <p><FaBuilding className="footer-icon" /> Branch 1:</p>
            <p><FaMapMarkerAlt className="footer-icon address" /> 1/7790 East Gorakh Park, Main Baburpur Road, Shahdara Delhi</p>
          </div>
          <div className="branch-info">
            <p><FaBuilding className="footer-icon" /> Branch 2:</p>
            <p><FaMapMarkerAlt className="footer-icon address" /> Shiv Mandir Marg, Shahdara Delhi</p>
          </div>
        </div>
      </div>
      
      <div className="footer-bottom">
        <p><FaCopyright /> {currentYear} Adhyayan Classes. All Rights Reserved.</p>
      </div>
    </footer>
  );
};

export default Footer; 