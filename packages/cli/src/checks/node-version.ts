const MIN_MAJOR_VERSION = 20;

export function checkNodeVersion(): { ok: boolean; message: string } {
    const version = process.versions.node;
    const major = Number(version.split(".")[0]);
    if (major >= MIN_MAJOR_VERSION) {
        return { ok: true, message: `Node.js ${version} (>= ${MIN_MAJOR_VERSION} required)` };
    }
    return {
        ok: false,
        message: `Node.js ${version} is below the minimum supported version (>= ${MIN_MAJOR_VERSION}). Please upgrade.`,
    };
}
