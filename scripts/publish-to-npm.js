/* eslint-disable no-console */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable @typescript-eslint/no-var-requires */

/**
 * @typedef {{
 *   name: string
 *   version: string
 *   [key: string]: any
 * }} Pkg
 */

const { promises: fsp } = require('fs');
const execa = require('execa');

/**
 * @returns {Promise<Pkg>}
 */
async function getPkg() {
  const source = await fsp.readFile('package.json', 'utf8');
  const pkg = JSON.parse(source);

  return pkg;
}

/**
 * @param {Pkg} pkg
 * @returns {Promise<void>}
 */
async function setPkg(pkg) {
  await fsp.writeFile('package.json', JSON.stringify(pkg, null, 2), 'utf8');
}

/**
 * @param {string} sha
 * @returns {Promise<string>}
 */
async function updateExperimentalVersion(sha) {
  const pkg = await getPkg();
  const version = `0.0.0-experimental-${sha.slice(0, 7)}`;

  pkg.version = version;

  await setPkg(pkg);

  return version;
}

/**
 * @returns {Promise<string | false>}
 */
async function hasGit() {
  try {
    const {
      stdout,
    } = await execa('git', ['--version']);

    const match = stdout.match(/git version (\d+\.\d+\.\d+.*)$/);

    if (match) {
      return match[1];
    }

    return stdout;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return false;
    }

    throw error;
  }
}

/**
 * @returns {Promise<string | false>}
 */
async function hasNode() {
  try {
    const {
      stdout,
    } = await execa('node', ['--version']);

    const match = stdout.match(/^v(\d+\.\d+\.\d+)$/);

    if (match) {
      return match[1];
    }

    return stdout;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return false;
    }

    throw error;
  }
}

/**
 * @returns {Promise<string | false>}
 */
async function hasNpm() {
  try {
    const {
      stdout,
    } = await execa('npm', ['--version']);

    const match = stdout.match(/^(\d+\.\d+\.\d+)$/);

    if (match) {
      return match[1];
    }

    return stdout;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return false;
    }

    throw error;
  }
}

/**
 * @returns {Promise<string | false>}
 */
async function hasYarn() {
  try {
    const {
      stdout,
    } = await execa('yarn', ['--version']);

    const match = stdout.match(/^(\d+\.\d+\.\d+)$/);

    if (match) {
      return match[1];
    }

    return stdout;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return false;
    }

    throw error;
  }
}

/**
 * @returns {Promise<string>}
 */
async function getCommitBranch() {
  const {
    stdout,
  } = await execa('git', ['rev-parse', '--abbrev-ref', 'HEAD']);

  return stdout;
}

/**
 * @returns {Promise<string>}
 */
async function getCommitShortSha() {
  const {
    stdout,
  } = await execa('git', ['rev-parse', '--short', 'HEAD']);

  return stdout;
}

/**
 * @returns {Promise<string>}
 */
async function getCommitTag() {
  const {
    stdout,
  } = await execa('git', ['describe', '--tags', '--exact-match']);

  return stdout;
}

/**
 * @param {'latest' | 'experimental'} [channel='latest']
 * @param {'public' | 'restricted'} [access='public']
 * @returns {Promise<string>}
 */
async function publishToChannel(channel = 'latest', access = 'public') {
  const {
    stdout,
  } = await execa('yarn', ['publish', '--tag', channel, '--access', access]);

  return stdout;
}

/**
 * @param {'public' | 'restricted'} [access='public']
 * @returns {Promise<void>}
 */
async function publish(access = 'public') {
  const gitVersion = await hasGit();

  if (!gitVersion) {
    const error = new Error('no `git` command found, please ensure `git` is exists in your `PATH` first');

    throw error;
  }

  const nodeVersion = await hasNode();

  if (!nodeVersion) {
    const error = new Error('no `node` command found, please ensure `node` is exists in your `PATH` first');

    throw error;
  }

  const npmVersion = await hasNpm();

  if (!npmVersion) {
    const error = new Error('no `npm` command found, please ensure `npm` is exists in your `PATH` first');

    throw error;
  }

  const yarnVersion = await hasYarn();

  if (!yarnVersion) {
    const error = new Error('no `yarn` command found, please ensure `yarn` is exists in your `PATH` first');

    throw error;
  }

  const commitBranch = await getCommitBranch();

  const commitShortSha = await getCommitShortSha();

  console.info('------------------------------------------------------------');

  console.info('      GIT_VERSION: %s', gitVersion);

  console.info('     NODE_VERSION: %s', nodeVersion);

  console.info('      NPM_VERSION: %s', npmVersion);

  console.info('     YARN_VERSION: %s', yarnVersion);

  console.info('    COMMIT_BRANCH: %s', commitBranch);

  console.info(' COMMIT_SHORT_SHA: %s', commitShortSha);

  let commitTag;

  try {
    commitTag = await getCommitTag();
  } catch (error) {
    commitTag = null;
  }

  console.info('       COMMIT_TAG: %s', commitTag);

  console.info('------------------------------------------------------------');

  if (commitTag) {
    let channel;

    if (/^v\d+\.\d+\.\d+$/.test(commitTag)) {
      channel = 'latest';
    } else if (/-experimental$/.test(commitTag)) {
      await updateExperimentalVersion(commitShortSha);
      channel = 'experimental';
    } else {
      channel = null;
    }

    if (channel) {
      const pkg = await getPkg();

      console.info('start to publish %s@%s to channel "%s"', pkg.name, pkg.version, channel);

      const out = await publishToChannel(channel, access);

      console.info(out);

      console.info('publish %s@%s to channel "%s" done', pkg.name, pkg.version, channel);
    } else {
      console.warn('commit tag do not match any channel pattern, skip to publish');
    }
  } else {
    console.warn('no commit tag found, skip to publish');
  }
}

/**
 * @param {string[]} args
 * @returns {Promise<void>}
 */
async function run(args) {
  try {
    await publish(args[2]);
  } catch (error) {
    console.error('publish failed with error: %s', error);

    process.exit(1);
  }
}

run(process.argv);
