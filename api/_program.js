const programSlots = [
  {
    id: 'early-prayer',
    name: 'Early Morning Prayers',
    timeRange: '5:00 AM - 6:00 AM',
    contentType: 'prayer',
    startHour: 5,
    endHour: 6,
    description: 'Prayer and preparation for the day.',
    sample: {
      title: 'Early Morning Prayers',
      subtitle: 'Grace Community Church',
      text: 'Lord, cover this church family today. Guide every home, every journey, and every decision.',
      duration: 3600,
    },
  },
  {
    id: 'morning-worship',
    name: 'Morning Worship Set',
    timeRange: '6:00 AM - 9:00 AM',
    contentType: 'worship',
    startHour: 6,
    endHour: 9,
    description: 'A morning worship block for members joining from home, work, and the road.',
    sample: {
      title: 'Morning Worship Set',
      subtitle: 'Grace Community Church',
      text: 'Welcome to Voices. Grace Community Church is on the air with morning worship from Accra.',
      duration: 10800,
    },
  },
  {
    id: 'member-shoutouts',
    name: 'Member Shoutouts',
    timeRange: '9:00 AM - 10:00 AM',
    contentType: 'announcement',
    startHour: 9,
    endHour: 10,
    description: 'Approved messages and birthday greetings from church members.',
    sample: {
      title: 'Member Shoutouts',
      subtitle: 'Approved queue',
      text: 'Birthday greetings, testimonies, and encouragement from the church family.',
      duration: 3600,
    },
  },
  {
    id: 'sermon-replay',
    name: 'Sunday Sermon Replay',
    timeRange: '10:00 AM - 12:00 PM',
    contentType: 'sermon',
    startHour: 10,
    endHour: 12,
    description: 'Replay of the latest Sunday message.',
    sample: {
      title: 'Sunday Sermon Replay',
      subtitle: 'Pastor Amos',
      text: 'Faith grows when the word of God becomes the rhythm of the home.',
      duration: 7200,
    },
  },
  {
    id: 'midday-prayer',
    name: 'Midday Prayers',
    timeRange: '12:00 PM - 3:00 PM',
    contentType: 'prayer',
    startHour: 12,
    endHour: 15,
    description: 'A midday prayer pause and encouragement block.',
    sample: {
      title: 'Midday Prayers',
      subtitle: 'Grace Community Church',
      text: 'May peace meet every listener in the middle of the day.',
      duration: 10800,
    },
  },
  {
    id: 'afternoon-worship',
    name: 'Afternoon Worship Mix',
    timeRange: '3:00 PM - 6:00 PM',
    contentType: 'worship',
    startHour: 15,
    endHour: 18,
    description: 'Worship music and short encouragement for the afternoon.',
    sample: {
      title: 'Afternoon Worship Mix',
      subtitle: 'Voices Worship',
      text: 'A worship mix for the afternoon, keeping the church connected wherever members are listening.',
      duration: 10800,
    },
  },
  {
    id: 'evening-devotional',
    name: 'Evening Devotional',
    timeRange: '6:00 PM - 12:00 AM',
    contentType: 'devotional',
    startHour: 18,
    endHour: 24,
    description: 'Evening Scripture, reflection, and family prayer.',
    sample: {
      title: 'Evening Devotional',
      subtitle: 'Psalm 23:1-3',
      text: 'The Lord is my shepherd; I shall not want. He maketh me to lie down in green pastures.',
      duration: 21600,
    },
  },
  {
    id: 'night-watch',
    name: 'Night Watch',
    timeRange: '12:00 AM - 5:00 AM',
    contentType: 'devotional',
    startHour: 0,
    endHour: 5,
    description: 'Quiet Scripture and overnight prayer.',
    sample: {
      title: 'Night Watch',
      subtitle: 'Psalm 4:8',
      text: 'I will both lay me down in peace, and sleep: for thou, Lord, only makest me dwell in safety.',
      duration: 18000,
    },
  },
];

function getCurrentSlot(date = new Date()) {
  const hour = date.getHours();
  return programSlots.find((slot) => hour >= slot.startHour && hour < slot.endHour) || programSlots[1];
}

function minutesFromSlot(slot) {
  return slot.startHour * 60;
}

function getProgress(slot, date = new Date()) {
  const nowMinutes = date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60;
  const start = minutesFromSlot(slot);
  const end = slot.endHour * 60;
  const total = Math.max(1, end - start);
  const elapsed = Math.max(0, nowMinutes - start);
  return Math.min(100, Math.round((elapsed / total) * 100));
}

module.exports = {
  programSlots,
  getCurrentSlot,
  getProgress,
};
