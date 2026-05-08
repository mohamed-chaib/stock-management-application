/**
 * RSA-2048 Public Key — embedded at compile time.
 * 
 * This key is used to VERIFY license signatures.
 * The corresponding private key is kept by the vendor (never shipped).
 * 
 * Embedding as a string constant (vs reading from filesystem) prevents
 * trivial key-swap attacks where someone replaces public.pem on disk.
 */
export const PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAluDgLQgP4PkITV6Amlsk
I4SfnuF2q64Zomin+xTR4KVz9XBtl2GKZXm18+fOb0A97WIcEFzyN6RZ9PTMT1CK
1MEQFK9VOLbu59JZ1L+AEeJEx9SvVXyiDnpSiHiarhN0emPFQsAqkWItRvBBb+II
ZJCjp3zQUceQTAdk5WlD4BUQhHYA/yTgo3DRoA8bHAVMohte3dcCBPW/hsWYz5zA
8TKRlB0LfvpCcakamUUgt7VXjTKhON2gUA2E6arX9KvT75FUnUxYZkiPD9z9mBDa
XRZDq1xhWcsPiVhX0eZIqt6Er8A6/yustYjp9BAwqmeUwBkULR2pl04vCCOUAGQ0
+wIDAQAB
-----END PUBLIC KEY-----`;
