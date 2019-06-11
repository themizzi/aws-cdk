import { Construct, ISynthesisSession, Stack } from '@aws-cdk/cdk';
import fs = require('fs');
import path = require('path');
import { CfnStack } from './cloudformation.generated';

const NESTED_STACK_SYMBOL = Symbol.for('@aws-cdk/aws-cloudformation.NestedStack');

export interface NestedStackProps {

}

/**
 * A nested CloudFormation stack.
 *
 * This means that it must have a non-nested Stack as an ancestor, into which an
 * `AWS::CloudFormation::Stack` resource will be synthesized into the parent
 * stack.
 *
 * Furthermore, this stack will not be treated as an independent deployment
 * artifact (won't be listed in "cdk list" or deployable through "cdk deploy"),
 * but rather only synthesized as a template and uploaded as an asset to S3.
 *
 * Cross references of resource attributes between the parent stack and the
 * nested stack will automatically be translated to stack parameters and
 * outputs.
 *
 * @default false The stack is a top-level stack (not nested)
 */
export class NestedStack extends Stack {
  public static isNestedStack(x: any): x is NestedStack {
    return x != null && typeof(x) === 'object' && NESTED_STACK_SYMBOL in x;
  }

  private readonly templateFile: string;

  constructor(scope: Construct, id: string, _props: NestedStackProps = { }) {
    super(scope, id);
    Object.defineProperty(this, NESTED_STACK_SYMBOL, { value: true });

    new CfnStack(scope, `${id}.Resource`, {
      templateUrl: 'http://sss'
    });

    this.templateFile = `${this.node.uniqueId}.nested.template.json`;

    const parent = this.lookupParentForNestedStack();
    parent.addFileAsset({
      packaging: 'file',
      assetPath: this.templateFile,
    });
  }

  protected synthesize(session: ISynthesisSession) {
    const filePath = path.join(session.assembly.outdir, this.templateFile);
    fs.writeFileSync(filePath, JSON.stringify(this.toCloudFormation(), undefined, 2), 'utf-8');
  }

  /**
   * Looks up the parent stack for a nested stack.
   */
  private lookupParentForNestedStack() {
    const scope = this.node.scope;
    const scopes = scope ? scope.node.scopes.reverse() : [];
    const parent = scopes.find(x => Stack.isStack(x));
    if (!parent || !Stack.isStack(parent) || NestedStack.isNestedStack(parent)) {
      throw new Error(`Nested stack defined in "${this.node.path}" must be defined within scope of another non-nested stack`);
    }

    return parent;
  }
}