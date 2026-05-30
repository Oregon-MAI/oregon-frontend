export type ResourceType =
  | 'RESOURCE_TYPE_UNSPECIFIED'
  | 'RESOURCE_TYPE_MEETING_ROOM'
  | 'RESOURCE_TYPE_WORKSPACE'
  | 'RESOURCE_TYPE_DEVICE'

export type ResourceStatus =
  | 'RESOURCE_STATUS_UNSPECIFIED'
  | 'RESOURCE_STATUS_AVAILABLE'
  | 'RESOURCE_STATUS_OCCUPIED'
  | 'RESOURCE_STATUS_MAINTENANCE'
  | 'RESOURCE_STATUS_EMERGENCY'

export interface MeetingRoomDetails {
  capacity: number
  has_projector: boolean
  has_whiteboard: boolean
}

export interface WorkspaceDetails {
  has_monitor: boolean
}

export interface DeviceDetails {
  device_type: string
  serial_number: string
  model: string
  description: string
}

export interface Resource {
  resource_id: string
  uuid?: string         // actual DB column name
  id?: string           // proto field name fallback
  name: string
  type: ResourceType
  location: string
  status: ResourceStatus
  meeting_room?: MeetingRoomDetails
  workspace?: WorkspaceDetails
  device?: DeviceDetails
  details?: MeetingRoomDetails | WorkspaceDetails | DeviceDetails  // backend field name
  created_at?: string
  updated_at?: string
}

export interface CreateResourceRequest {
  name: string
  type: ResourceType
  location: string
  details?: MeetingRoomDetails | WorkspaceDetails | DeviceDetails
}

export interface ChangeResourceStatusRequest {
  resource_id: string
  status: ResourceStatus
  reason: string
}

export interface CreateBookingRequest {
  resource_id: string
  user_id: string
  starts_at: string   // RFC 3339 / ISO 8601 UTC timestamp
  ends_at: string     // RFC 3339 / ISO 8601 UTC timestamp
}

export interface BookingResponse {
  // gRPC gateway fields
  booking_id?: string
  resource_id?: string
  user_id?: string
  resource_name?: string   // convenience field, may be absent
  resource_type?: string
  resource_location?: string
  starts_at?: string
  ends_at?: string
  status?: string
  // legacy / fallback fields
  id?: string
  date?: string
  time_from?: string
  time_to?: string
}
