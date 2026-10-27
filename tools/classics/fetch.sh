base=https://raw.githubusercontent.com/GITenberg
mkdir -p classics
while read repo; do
  id=${repo##*_}
  for f in "$id.txt" "$id-0.txt" "$id-8.txt" "pg$id.txt"; do
    code=$(curl -sS -o "classics/$id.txt" -w '%{http_code}' --max-time 60 "$base/$repo/master/$f")
    if [ "$code" = 200 ]; then echo "ok $repo/$f $(wc -c < classics/$id.txt)"; break; fi
  done
  [ "$code" = 200 ] || { echo "MISS $repo"; rm -f "classics/$id.txt"; }
done
