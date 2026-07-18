/**
 * Single-station launch config for first customer.
 * Edit STATION + programmeSlots when onboarding a church.
 */

const STATION = {
  name: 'The Church in Tema',
  location: 'Tema, Ghana',
  tagline: '24/7 radio for our church family in Tema',
  listeners: 12,
  // Share / brand
  shortCode: 'tema',
  // Google Drive programme library (override with GOOGLE_DRIVE_FOLDER_ID env)
  driveFolderId: '17G-YzPxBMj41bpxCJoRhz4Rp7vGubrDZ',
  driveFolderUrl: 'https://drive.google.com/drive/folders/17G-YzPxBMj41bpxCJoRhz4Rp7vGubrDZ',
};

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
      subtitle: STATION.name,
      text:
        'Good morning, church family. Let us begin this day with the Lord. Father, we thank You for life, for breath, and for mercy that is new every morning. Cover every home connected to this station. Guide our steps, guard our hearts, and let Your peace rest on our children, our work, and our city. In Jesus’ name, amen.',
      duration: 3600,
    },
  },
  {
    id: 'morning-worship',
    name: 'Morning Worship',
    timeRange: '6:00 AM - 9:00 AM',
    contentType: 'worship',
    startHour: 6,
    endHour: 9,
    description: 'Worship and encouragement for the morning.',
    sample: {
      title: 'Morning Worship',
      subtitle: STATION.name,
      text:
        'Welcome to Voices, the radio heart of our church. This is a morning of worship. Lift your voice where you are — in the car, in the kitchen, on the way to work. Great is the Lord, and greatly to be praised. May this block fill your home with hope and praise as we start the day together.',
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
    description: 'Greetings and encouragement from the church family.',
    sample: {
      title: 'Member Shoutouts',
      subtitle: 'Church family',
      text:
        'This is Member Shoutouts. If you are listening from near or far, you are part of this family. We celebrate birthdays, testimonies, and simple words of love. Send your greeting to the station team, and may every message remind someone they are not alone.',
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
      subtitle: 'Word of the week',
      text:
        'Faith comes by hearing, and hearing by the word of God. Today we replay the heart of Sunday’s message: trust God in the ordinary places. When pressure rises, return to His promises. When joy comes, give thanks. Let the word shape how you speak, work, and love this week.',
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
    description: 'A midday prayer pause and encouragement.',
    sample: {
      title: 'Midday Prayers',
      subtitle: STATION.name,
      text:
        'Midday pause. Wherever you are, take a breath. Lord, meet us in the middle of the day. Renew strength for those who are tired, peace for the anxious, and wisdom for every decision still ahead. We cast our cares on You, because You care for us.',
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
    description: 'Worship and short encouragement for the afternoon.',
    sample: {
      title: 'Afternoon Worship Mix',
      subtitle: 'Voices Worship',
      text:
        'Afternoon worship is on. Let praise reset the tone of your day. The Lord is good, and His mercy endures forever. Stay with us as we keep the church connected — one song, one prayer, one family across many places.',
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
      text:
        'The Lord is my shepherd; I shall not want. He makes me to lie down in green pastures. He leads me beside the still waters. He restores my soul. Church family, as evening settles, rest in the care of the Shepherd. Forgive quickly, love deeply, and end this day with gratitude.',
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
      text:
        'I will both lay me down in peace, and sleep: for thou, Lord, only makest me dwell in safety. This is Night Watch. For those awake, for those in shift work, for those carrying a burden into the night — the Lord is near. Rest under His covering until morning light.',
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

/** Build a spoken script for TTS (intro + body, loops cleanly). */
function getSpeakScript(slot) {
  const title = slot.sample?.title || slot.name;
  const body = slot.sample?.text || slot.description || '';
  return `You are listening to ${STATION.name}. Now on air: ${title}. ${body}`;
}

module.exports = {
  STATION,
  programSlots,
  getCurrentSlot,
  getProgress,
  getSpeakScript,
};
