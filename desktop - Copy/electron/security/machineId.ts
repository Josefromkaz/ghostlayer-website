import * as os from 'os';
import * as crypto from 'crypto';

/**
 * Generates a unique machine identifier based on hardware and system characteristics.
 * This ID is used to bind encryption keys to the specific machine.
 *
 * Components used:
 * - Hostname
 * - Platform (win32, darwin, linux)
 * - CPU architecture
 * - Username
 * - Home directory path
 * - First non-internal MAC address
 *
 * The combination provides a reasonably unique fingerprint that:
 * - Changes if the machine is cloned to another system
 * - Remains stable across reboots
 * - Doesn't require admin privileges to read
 */
export function generateMachineId(): string {
  const components: string[] = [];

  // Basic system info
  components.push(os.hostname());
  components.push(os.platform());
  components.push(os.arch());

  // User info
  try {
    const userInfo = os.userInfo();
    components.push(userInfo.username);
    components.push(userInfo.homedir);
  } catch {
    // Fallback if userInfo is not available
    components.push(process.env.USERNAME || process.env.USER || 'unknown');
    components.push(os.homedir());
  }

  // Network interface MAC address (first non-internal, non-zero)
  const networkInterfaces = os.networkInterfaces();
  let macAddress = '';

  for (const interfaces of Object.values(networkInterfaces)) {
    if (!interfaces) continue;

    for (const iface of interfaces) {
      if (
        !iface.internal &&
        iface.mac &&
        iface.mac !== '00:00:00:00:00:00'
      ) {
        macAddress = iface.mac;
        break;
      }
    }

    if (macAddress) break;
  }

  components.push(macAddress);

  // CPU info for additional uniqueness
  const cpus = os.cpus();
  if (cpus.length > 0) {
    components.push(cpus[0].model);
    components.push(String(cpus.length));
  }

  // Generate SHA-256 hash of all components
  const hash = crypto
    .createHash('sha256')
    .update(components.join('|'))
    .digest('hex');

  return hash;
}

/**
 * Generates a shorter machine ID suitable for display purposes.
 * Returns first 16 characters of the full hash.
 */
export function getShortMachineId(): string {
  return generateMachineId().substring(0, 16);
}

/**
 * Verifies if a given machine ID matches the current machine.
 */
export function verifyMachineId(storedId: string): boolean {
  const currentId = generateMachineId();
  return crypto.timingSafeEqual(
    Buffer.from(storedId, 'hex'),
    Buffer.from(currentId, 'hex')
  );
}
