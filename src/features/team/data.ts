export type StaffRecord = {
  id: string
  name: string
  avatar: string
  status: string
  role: string
  facility: string
  email: string
  phone: string
  license?: string
  joinedOn?: string
}

export const MOCK_STAFF: StaffRecord[] = [
  {
    id: "1",
    name: "Rafael C. Salles, M.D.",
    avatar: "https://i.pravatar.cc/150?u=rafael-salles",
    status: "Active",
    role: "Admin",
    facility: "RHU 1 (Main Birthing Clinic)",
    email: "mho.pili@camur.gov.ph",
    phone: "0917 888 2001",
    joinedOn: "June 08, 2026",
  },
  {
    id: "2",
    name: "Patrick Kurt Villamer",
    avatar: "https://i.pravatar.cc/150?u=patrick-villamer",
    status: "Active",
    role: "Midwife",
    facility: "RHU 1",
    email: "patrickkurtv@gmail.com",
    phone: "0968 625 5210",
    joinedOn: "June 08, 2026",
  },
  {
    id: "3",
    name: "Maria Clara Santos",
    avatar: "https://i.pravatar.cc/150?u=maria-clara-santos",
    status: "Active",
    role: "Nurse",
    facility: "San Isidro BHS",
    email: "maria.santos@gmail.com",
    phone: "0912 345 6789",
    joinedOn: "September 14, 2026",
  },
  {
    id: "4",
    name: "Juan Dela Cruz",
    avatar: "https://i.pravatar.cc/150?u=juan-dela-cruz",
    status: "Pending Activation",
    role: "Nurse",
    facility: "Carolina BHS",
    email: "juan.delacruz@gmail.com",
    phone: "0920 123 4567",
    joinedOn: "Pending invitation",
  },
]

export const STAFF_FILTERS = {
  Role: ["Nurse", "Midwife", "Admin"],
  Facility: ["RHU 1 (Main Birthing Unit)", "San Isidro BHS", "Carolina BHS", "Himaao BHS", "Anayan BHS"],
  Status: ["Active", "Pending Activation", "Deactivated"],
}
