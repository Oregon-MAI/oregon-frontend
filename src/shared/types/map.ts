export interface Desk {
  resourceId?: string   // backend resource_id (undefined for mock data)
  id: string            // display name, e.g. "A1"
  zone: 'A' | 'B' | 'D'
  zoneName?: string
  status: 'free' | 'busy' | 'mine'
  amenities: string[]
  bookedSlots: string[]
  location?: string
}

export interface Zone {
  id: 'A' | 'B' | 'D'
  name: string
  desks: Desk[]
}

export interface MapRoom {
  resourceId?: string
  id: string
  status: 'free' | 'busy' | 'mine'
  capacity: number
  amenities: string[]
  bookedSlots: string[]
  location?: string
}

export interface Booking {
  id: string
  resourceId: string
  resourceName: string
  timeFrom: string
  timeTo: string
  date: string
  resourceType?: string
  resourceLocation?: string
}
