import cxapi = require('@aws-cdk/cx-api');
import { Fn } from './cfn-fn';
import { CfnParameter } from './cfn-parameter';
import { Construct } from './construct';
import { Stack } from './stack';

export interface FileAssetProps {
  /**
   * Path relative to the cloud assembly output which points to the asset to upload to S3.
   */
  readonly assetPath: string;

  /**
   * The type of packaging to do for the asset (e.g. upload a file or zip a directory)
   */
  readonly packaging: 'zip' | 'file';
}

export class FileAsset extends Construct {
  /**
   * Attribute that represents the name of the bucket this asset exists in.
   */
  public readonly s3BucketName: string;

  /**
   * Attribute which represents the S3 object key of this asset.
   */
  public readonly s3ObjectKey: string;

  /**
   * The prefix of the S3 location.
   */
  public readonly s3Prefix: string;

  /**
   * A hash of the bundle for of this asset, which is only available at deployment time. As this is
   * a late-bound token, it may not be used in construct IDs, but can be passed as a resource
   * property in order to force a change on a resource when an asset is effectively updated. This is
   * more reliable than `sourceHash` in particular for assets which bundling phase involve external
   * resources that can change over time (such as Docker image builds).
   */
  public readonly artifactHash: string;

  constructor(scope: Stack, id: string, props: FileAssetProps) {
    super(scope, id);

    const bucketParam = new CfnParameter(this, 'S3Bucket', {
      type: 'String',
      description: `S3 bucket for asset "${props.assetPath}"`,
    });

    const keyParam = new CfnParameter(this, 'S3VersionKey', {
      type: 'String',
      description: `S3 key for asset version "${props.assetPath}"`
    });

    const hashParam = new CfnParameter(this, 'ArtifactHash', {
      description: `Artifact hash for asset "${props.assetPath}"`,
      type: 'String',
    });

    this.s3BucketName = bucketParam.valueAsString;
    this.s3Prefix = Fn.select(0, Fn.split(cxapi.ASSET_PREFIX_SEPARATOR, keyParam.valueAsString)).toString();
    const s3Filename = Fn.select(1, Fn.split(cxapi.ASSET_PREFIX_SEPARATOR, keyParam.valueAsString)).toString();
    this.s3ObjectKey = `${this.s3Prefix}${s3Filename}`;
    this.artifactHash = hashParam.valueAsString;

    // attach metadata to the lambda function which includes information
    // for tooling to be able to package and upload a directory to the
    // s3 bucket and plug in the bucket name and key in the correct
    // parameters.
    const asset: cxapi.FileAssetMetadataEntry = {
      path: props.assetPath,
      id: this.node.uniqueId,
      packaging: props.packaging,

      s3BucketParameter: bucketParam.logicalId,
      s3KeyParameter: keyParam.logicalId,
      artifactHashParameter: hashParam.logicalId,
    };

    this.node.addMetadata(cxapi.ASSET_METADATA, asset);
  }
}
