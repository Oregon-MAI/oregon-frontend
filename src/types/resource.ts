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
  name: string
  type: ResourceType
  location: string
  status: ResourceStatus
  meeting_room?: MeetingRoomDetails
  workspace?: WorkspaceDetails
  device?: DeviceDetails
  created_at?: string
  updated_at?: string
}

export interface CreateResourceRequest {
  name: string
  type: ResourceType
  location: string
  meeting_room?: MeetingRoomDetails
  workspace?: WorkspaceDetails
  device?: DeviceDetails
}

export interface ChangeResourceStatusRequest {
  resource_id: string
  status: ResourceStatus
  reason: string
}

export interface CreateBookingRequest {
  resource_id: string
  date: string
  time_from: string
  time_to: string
}

export interface BookingResponse {
  id: string
  resource_id: string
  resource_name: string
  date: string
  time_from: string
  time_to: string
}
