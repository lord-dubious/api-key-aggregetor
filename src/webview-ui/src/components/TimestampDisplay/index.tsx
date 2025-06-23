import React, { useState, useEffect } from 'react';

interface TimestampDisplayProps {
  date: Date;
}

const formatTimeAgo = (date: Date): string => {
  const now = new Date();
  const seconds = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));

  if (seconds < 60) {
    return `${seconds} sec ago`;
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes} min ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} hour(s) ago`;
  }

  const days = Math.floor(hours / 24);
  if (days < 30) {
    return `${days} day(s) ago`;
  }

  const months = Math.floor(days / 30); // Approximate months
  if (months < 12) {
    return `${months} month(s) ago`;
  }

  const years = Math.floor(days / 365); // Approximate years
  return `${years} year(s) ago`;
};

const TimestampDisplay: React.FC<TimestampDisplayProps> = ({ date }) => {
  // test is date is a valid Date object
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    return <span>Invalid date</span>;
  }

  const [displayTime, setDisplayTime] = useState(formatTimeAgo(date));

  useEffect(() => {
    const timer = setInterval(() => {
      setDisplayTime(formatTimeAgo(date));
    }, 1000);

    return () => clearInterval(timer);
  }, [date]);

  return <span>{displayTime}</span>;
};

export default TimestampDisplay;