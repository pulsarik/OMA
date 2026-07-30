import { DEFAULT_BOT_NAMES } from './game';

export type LobbyMember = {
  id: string;
  token: string;
  name: string;
  isBot: boolean;
  joinedAt: number;
  seat?: number;
  playerId?: string;
};

export type Lobby = {
  id: string;
  pin: string;
  tableName: string;
  hostMemberId: string;
  maxPlayers: number;
  status: 'waiting' | 'started';
  members: LobbyMember[];
  handId?: string;
  failedPinAttempts?: number;
  created: number;
  lastActivity: number;
};

export const WORLD_CAPITALS = [
  'Abu Dhabi', 'Abuja', 'Accra', 'Addis Ababa', 'Algiers', 'Amman',
  'Amsterdam', 'Andorra la Vella', 'Ankara', 'Antananarivo', 'Apia',
  'Ashgabat', 'Asmara', 'Astana', 'Asuncion', 'Athens', 'Baghdad', 'Baku',
  'Bamako', 'Bandar Seri Begawan', 'Bangkok', 'Bangui', 'Banjul', 'Beijing',
  'Beirut', 'Belgrade', 'Belmopan', 'Berlin', 'Bern', 'Bishkek', 'Bissau',
  'Bogota', 'Brasilia', 'Bratislava', 'Brazzaville', 'Bridgetown', 'Brussels',
  'Bucharest', 'Budapest', 'Buenos Aires', 'Cairo', 'Canberra', 'Caracas',
  'Castries', 'Chisinau', 'Conakry', 'Copenhagen', 'Dakar', 'Damascus',
  'Dhaka', 'Dili', 'Djibouti', 'Doha', 'Dublin', 'Dushanbe', 'Freetown',
  'Funafuti', 'Gaborone', 'Georgetown', 'Guatemala City', 'Hanoi', 'Harare',
  'Havana', 'Helsinki', 'Honiara', 'Islamabad', 'Jakarta', 'Jerusalem',
  'Juba', 'Kabul', 'Kampala', 'Kathmandu', 'Khartoum', 'Kigali', 'Kingston',
  'Kingstown', 'Kinshasa', 'Kuala Lumpur', 'Kuwait City', 'Kyiv', 'Libreville',
  'Lilongwe', 'Lima', 'Lisbon', 'Ljubljana', 'Lome', 'London', 'Luanda',
  'Lusaka', 'Luxembourg', 'Madrid', 'Majuro', 'Malabo', 'Male', 'Managua',
  'Manama', 'Manila', 'Maputo', 'Maseru', 'Mbabane', 'Mexico City', 'Minsk',
  'Mogadishu', 'Monaco', 'Monrovia', 'Montevideo', 'Moroni', 'Moscow',
  'Muscat', 'Nairobi', 'Nassau', 'Naypyidaw', "N'Djamena", 'New Delhi',
  'Ngerulmud', 'Niamey', 'Nicosia', 'Nouakchott', "Nuku'alofa", 'Oslo',
  'Ottawa', 'Ouagadougou', 'Panama City', 'Paramaribo', 'Paris', 'Phnom Penh',
  'Podgorica', 'Port Louis', 'Port Moresby', 'Port Vila', 'Port-au-Prince',
  'Port of Spain', 'Prague', 'Praia', 'Pretoria', 'Pyongyang', 'Quito',
  'Rabat', 'Reykjavik', 'Riga', 'Riyadh', 'Rome', 'Roseau', 'San Jose',
  'San Marino', 'San Salvador', 'Sanaa', 'Santiago', 'Santo Domingo',
  'Sao Tome', 'Sarajevo', 'Seoul', 'Singapore', 'Skopje', 'Sofia',
  'Stockholm', 'Sucre', 'Suva', 'Taipei', 'Tallinn', 'Tashkent', 'Tbilisi',
  'Tegucigalpa', 'Tehran', 'Thimphu', 'Tirana', 'Tokyo', 'Tripoli', 'Tunis',
  'Ulaanbaatar', 'Vaduz', 'Valletta', 'Vatican City', 'Victoria', 'Vienna',
  'Vientiane', 'Vilnius', 'Warsaw', 'Washington', 'Wellington', 'Windhoek',
  'Yamoussoukro', 'Yaounde', 'Yerevan', 'Zagreb',
];

export function normalizeLobbySeats(lobby: Lobby) {
  const usedSeats = new Set<number>();
  lobby.members.forEach((member) => {
    if (
      Number.isInteger(member.seat)
      && member.seat! >= 0
      && member.seat! < lobby.maxPlayers
      && !usedSeats.has(member.seat!)
    ) {
      usedSeats.add(member.seat!);
      return;
    }
    member.seat = undefined;
  });
  lobby.members.forEach((member) => {
    if (member.seat !== undefined) return;
    const openSeat = Array.from({ length: lobby.maxPlayers }, (_, index) => index)
      .find(seat => !usedSeats.has(seat));
    if (openSeat === undefined) return;
    member.seat = openSeat;
    usedSeats.add(openSeat);
  });
  lobby.members.sort((a, b) => (a.seat ?? lobby.maxPlayers) - (b.seat ?? lobby.maxPlayers));
}

export function firstOpenLobbySeat(lobby: Lobby) {
  normalizeLobbySeats(lobby);
  const usedSeats = new Set(lobby.members.map(member => member.seat));
  return Array.from({ length: lobby.maxPlayers }, (_, index) => index)
    .find(seat => !usedSeats.has(seat));
}

export function seatedLobbyMembers(lobby: Lobby) {
  normalizeLobbySeats(lobby);
  return lobby.members;
}

export function lobbyName(value: unknown, fallback: string) {
  const name = typeof value === 'string' ? value.trim().slice(0, 30) : '';
  return name || fallback;
}

export function nextLobbyBotName(lobby: Lobby) {
  const usedNames = new Set(lobby.members.map(member => member.name.replace(/_bot$/i, '').toLowerCase()));
  return DEFAULT_BOT_NAMES.find(name => !usedNames.has(name.toLowerCase()))
    ?? `Guest ${lobby.members.length + 1}`;
}

export function lobbyBotName(lobby: Lobby, requestedName: unknown) {
  const name = lobbyName(requestedName, nextLobbyBotName(lobby));
  return name.toLowerCase().endsWith('_bot') ? name : `${name}_bot`;
}
