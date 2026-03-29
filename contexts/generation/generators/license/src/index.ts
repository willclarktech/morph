const MIT_LICENSE = (year: number): string => `MIT License

Copyright (c) ${year}

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`;

const APACHE_2_0_LICENSE = (year: number): string => `
                                 Apache License
                           Version 2.0, January 2004
                        http://www.apache.org/licenses/

   Copyright ${year}

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
`.trimStart();

type LicenseId = "MIT" | "Apache-2.0";

const LICENSE_GENERATORS: Record<LicenseId, (year: number) => string> = {
	MIT: MIT_LICENSE,
	"Apache-2.0": APACHE_2_0_LICENSE,
};

const KNOWN_LICENSES = new Set<string>(Object.keys(LICENSE_GENERATORS));

export const isKnownLicense = (id: string): id is LicenseId =>
	KNOWN_LICENSES.has(id);

export const generateLicense = (
	licenseId: string,
	year?: number,
): string | undefined => {
	if (!isKnownLicense(licenseId)) return undefined;
	return LICENSE_GENERATORS[licenseId](year ?? new Date().getFullYear());
};
