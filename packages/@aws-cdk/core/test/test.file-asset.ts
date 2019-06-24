import { Test } from 'nodeunit';
import { Stack, App } from '../lib';
import { toCloudFormation } from './util';

export = {
  'addFileAssets adds the relevant metadata and parameters to wire a file asset to the stack'(test: Test) {
    // GIVEN
    const stack = new Stack();

    // WHEN
    const result = stack.addFileAsset({
      assetPath: 'path/to/asset',
      packaging: 'zip'
    });

    // THEN
    test.deepEqual(toCloudFormation(stack), {
      Parameters: {
        assetzippathtoassetS3Bucket6263218D:
         { Type: 'String',
           Description: 'S3 bucket for asset "path/to/asset"' },
        assetzippathtoassetS3VersionKeyB2AE7FBA:
         { Type: 'String',
           Description: 'S3 key for asset version "path/to/asset"' },
        assetzippathtoassetArtifactHashBCA61268:
         { Type: 'String',
           Description: 'Artifact hash for asset "path/to/asset"' } }
    });
    test.deepEqual(stack.resolve(result.artifactHash), { Ref: 'assetzippathtoassetArtifactHashBCA61268' });
    test.deepEqual(stack.resolve(result.s3BucketName), { Ref: 'assetzippathtoassetS3Bucket6263218D' });
    test.deepEqual(stack.resolve(result.s3ObjectKey), { 'Fn::Join': [ '',
      [ { 'Fn::Select': [ 0, { 'Fn::Split': [ '||', { Ref: 'assetzippathtoassetS3VersionKeyB2AE7FBA' } ] } ] },
        { 'Fn::Select': [ 1, { 'Fn::Split': [ '||', { Ref: 'assetzippathtoassetS3VersionKeyB2AE7FBA' } ] } ] } ] ] });
    test.deepEqual(stack.resolve(result.s3Prefix), { 'Fn::Select': [ 0,
      { 'Fn::Split': [ '||', { Ref: 'assetzippathtoassetS3VersionKeyB2AE7FBA' } ] } ] });
    test.done();
  },

  'multiple assets with the same path+packaging will de-duplicate'(test: Test) {
    // GIVEN
    const app = new App();
    const stack = new Stack(app, 'my-stack');

    // WHEN
    const boom1 = stack.addFileAsset({ assetPath: 'boom', packaging: 'zip' });
    const boom2 = stack.addFileAsset({ assetPath: 'boom', packaging: 'zip' });
    const boom3 = stack.addFileAsset({ assetPath: 'boom', packaging: 'file' }); // this is different from zip:boom
    const hello1 = stack.addFileAsset({ assetPath: 'hello', packaging: 'zip' });
    const hello2 = stack.addFileAsset({ assetPath: 'hello', packaging: 'zip' });

    // THEN
    const assembly = app.synth();
    const artifact = assembly.getStack(stack.name);

    test.deepEqual(artifact.assets.length, 3);
    test.same(boom1, boom2);
    test.same(hello1, hello2);
    test.notEqual(boom2, boom3);
    test.done();
  }
};