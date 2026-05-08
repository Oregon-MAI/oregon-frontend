import type { Resource } from '../../../types/resource'

export function isResourceBlocked(resource: Pick<Resource, 'status'> | undefined): boolean {
  return resource?.status === 'RESOURCE_STATUS_MAINTENANCE' || resource?.status === 'RESOURCE_STATUS_EMERGENCY'
}
