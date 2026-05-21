-- ============================================================
-- Stoa Member Project Directory — Add Members & Email Support
-- Run this once in the Supabase SQL editor
-- ============================================================

-- 1. Add email column to members table (idempotent)
alter table members add column if not exists email text;

-- ============================================================
-- 2. Auto-link trigger: when a user signs in for the first
--    time via magic link, Supabase inserts a row in auth.users.
--    This trigger finds the matching member row by email and
--    sets their user_id so the dashboard can find them.
-- ============================================================
create or replace function public.link_member_on_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.members
  set user_id = new.id
  where lower(email) = lower(new.email)
    and user_id is null;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute procedure public.link_member_on_signup();

-- ============================================================
-- 3. Back-fill: link any auth users that already exist
-- ============================================================
update public.members m
set user_id = u.id
from auth.users u
where lower(m.email) = lower(u.email)
  and m.user_id is null;

-- ============================================================
-- 3b. RLS policy: let a logged-in user claim an unclaimed
--     member row that matches their email (safety net for
--     edge cases where the trigger didn't fire in time)
-- ============================================================
drop policy if exists "Users can claim unlinked member row" on members;
create policy "Users can claim unlinked member row"
  on members for update
  to authenticated
  using  (lower(email) = lower(auth.jwt() ->> 'email') and user_id is null)
  with check (user_id = auth.uid());

-- ============================================================
-- 4. Update existing members with emails from the member list
-- ============================================================
update members set email = 'rexmcintosh@gmail.com'   where slug = 'rex-mcintosh';
update members set email = 'to64time@gmail.com'      where slug = 'kyle-connel';
update members set email = 'arthur@tokenpage.xyz'    where slug = 'arthur-fox';
update members set email = 'psharma@vitaveda.health' where slug = 'priyank-sharma';
update members set email = 'madsgrant@gmail.com'     where slug = 'maddie-grant';
-- zeneca-roy has no email on file — leaving null

-- ============================================================
-- 5. Bulk-insert all remaining community members
--    visibility = 'community' → invisible publicly until they
--    log in and fill in their profile
-- ============================================================
insert into members (slug, name, email, visibility) values
  ('jacob-mcnett',        'Jacob McNett',           'jacobamcnett@gmail.com',          'community'),
  ('boggles-b',           'Boggles B',              'bhogle1121@gmail.com',            'community'),
  ('david-curtis',        'David Curtis',           'dcurtisinv@gmail.com',            'community'),
  ('matt-norris',         'Matt Norris',            'info@invigorateauckland.com',     'community'),
  ('niklas-stadler',      'Niklas Stadler',         'niklasstadler891@gmail.com',      'community'),
  ('mukund-agarwal',      'Mukund Agarwal',         'mukundagarwal.eth@gmail.com',     'community'),
  ('alex-belknap',        'Alex Belknap',           'abelknap24@gmail.com',            'community'),
  ('alex-robinson',       'Alex Robinson',          'alex@happylobsterchicago.com',    'community'),
  ('andros-wong',         'Andros Hin Loong Wong',  'andros@wonderverse.xyz',          'community'),
  ('gabe-weis',           'Gabe Weis',              'gabeweis@gmail.com',              'community'),
  ('beau-security',       'Beau Security',          'runningfoxllc@gmail.com',         'community'),
  ('jeff-s',              'Jeff S',                 'jeff@djsemail.com',               'community'),
  ('no-riil',             'No Riil',                'noriil4838@gmail.com',            'community'),
  ('srinivas-buddharaju', 'Srinivas Buddharaju',    'srinivasbuddharaju@gmail.com',    'community'),
  ('sir-a',               'Sir A',                  'adeel.khan.chi@gmail.com',        'community'),
  ('emer-gent',           'Emer Gent',              'emergent285@gmail.com',           'community'),
  ('simon-uritsky',       'Simon Uritsky',          'dfsjew@gmail.com',                'community'),
  ('kenny-miller',        'Kenny Miller',           'coloredmomentsgifts@gmail.com',   'community'),
  ('laura-roe',           'Laura Roe',              'ljrdvm@mac.com',                  'community'),
  ('david-garber',        'David Garber',           'davidgarber@gmail.com',           'community'),
  ('gp-c',                'Gp C',                   'gp115c24@gmail.com',              'community'),
  ('greg-oakford',        'Greg Oakford',           'greg.oakford@gmail.com',          'community'),
  ('nalini-singh',        'Nalini Singh',           null,                              'community'),
  ('kunal-bhasin',        'Kunal Bhasin',           null,                              'community'),
  ('ishwari-singh',       'Ishwari Singh',          'ishwari@nybanker.com',            'community'),
  ('jacy-sparkz',         'Jacy Sparkz',            'dakineextras@gmail.com',          'community'),
  ('matthew-haigh',       'Matthew Haigh',          'cmnft@outlook.com',               'community'),
  ('declan-owens',        'Declan Owens',           'declanpatrick@comcast.net',       'community'),
  ('johnny-rusu',         'Johnny Rusu',            'jlp.hbar@gmail.com',              'community'),
  ('bob-cake',            'Bob Cake',               'nftypets@gmail.com',              'community'),
  ('tom-m',               'Tom M',                  'tom.maddenbriggs@gmail.com',      'community'),
  ('ogr-njl',             'Ogr Njl',                'ogrnjl@gmail.com',                'community'),
  ('jacob-kearnes',       'Jacob Kearnes',          'jacob.kearnes@outlook.com',       'community'),
  ('zach-p',              'Zach P',                 'zpland22@gmail.com',              'community'),
  ('chesco-falah',        'Chesco Falah',           'chesco711@gmail.com',             'community'),
  ('ernest-rozenblyum',   'Ernest Rozenblyum',      'ernest.rozenblyum@gmail.com',     'community'),
  ('jason-reed',          'Jason Reed',             'asguard1@yahoo.com',              'community'),
  ('johann-jones',        'Johann Jones',           'johanncjones@gmail.com',          'community'),
  ('louis-b',             'Louis B',                'cbenny7634@gmail.com',            'community'),
  ('daniela-ahrens',      'Daniela Ahrens',         'danahr@web.de',                   'community'),
  ('bibi-beck',           'Bibi Beck',              'bibiartislife@gmail.com',         'community'),
  ('anthony-sha',         'Anthony Sha',            'anthonytonysha@gmail.com',        'community'),
  ('mickael-dancin',      'Mickael Dancin',         'mickael.dancin@gmail.com',        'community'),
  ('edward-joyce',        'Edward Joyce',           'eamonn_boyle@hotmail.com',        'community'),
  ('justin-c',            'Justin C',               'onchain.chemist@gmail.com',       'community'),
  ('filipe-marques',      'Filipe Marques',         'filiplanmarq@proton.me',          'community'),
  ('christian-kiel',      'Christian Kiel',         'c-kiel@web.de',                   'community'),
  ('bernhard-neumann',    'Bernhard Neumann',       'mail@bernhard.xyz',               'community'),
  ('bryce-pinkos',        'Bryce Pinkos',           'bryce.pinkos@gmail.com',          'community'),
  ('albert-duncan',       'Albert Duncan',          'thedunc@gmail.com',               'community'),
  ('jack-gk',             'Jack Gk',                'jack@unfungible.xyz',             'community'),
  ('rob-m',               'Rob M',                  'shouter.56-affine@icloud.com',    'community'),
  ('jan-milz',            'Jan Milz',               'milzjan@gmail.com',               'community'),
  ('david-rigden',        'David Rigden',           'drigden@gmx.com',                 'community'),
  ('isaac-calvert',       'Isaac Calvert',          'isaac@prestige-fit.com',          'community'),
  ('matthew-bond',        'Matthew Bond',           'mttbond@gmail.com',               'community'),
  ('georg-pinsolitsch',   'Georg Pinsolitsch',      'gpinsolitsch@proton.me',          'community'),
  ('tarry-g',             'Tarry G',                'tarryg@fastmail.fm',              'community'),
  ('conny-lorenz',        'Conny Lorenz',           'chconny@aol.com',                 'community'),
  ('krishan-patel',       'Krishan Patel',          null,                              'community'),
  ('cloud-geru',          'Cloud Geru',             'cloudgeru@gmail.com',             'community'),
  ('joris-langewouters',  'Joris Langewouters',     'jorislangewouters@gmail.com',     'community'),
  ('quadwitch-diego',     'Quadwitch Diego',        'dc@nessica.com',                  'community'),
  ('florian-floar-eth',   'Florian Floar.eth',      'floar@gmx.de',                    'community'),
  ('samo-w',              'Samo W',                 'samovarul@gmail.com',             'community'),
  ('alexander-schott',    'Alexander Schott',       'alexschott@gmx.net',              'community'),
  ('divya-chouhan',       'Divya Chouhan',          'divyachouhan1607@gmail.com',      'community'),
  ('mingles-mingles',     'Mingles Mingles',        'minglesnft@gmail.com',            'community'),
  ('leen-lumena',         'Leen Lumena',            'eileen.lumena@gmail.com',         'community'),
  ('mush-rooooom',        'Mush Rooooom',           'mytravels09@gmail.com',           'community'),
  ('ronnie-fernandez',    'Ronnie Fernandez',       'giuseppe04@gmail.com',            'community'),
  ('chris-moon',          'Chris Moon',             'm0on@hotmail.co.uk',              'community'),
  ('matthew-adeyemi',     'Matthew Adeyemi',        null,                              'community'),
  ('erik-zuuring',        'Erik Zuuring',           'erik.zuuring@gmail.com',          'community'),
  ('luca-ioannis',        'Luca Ioannis',           'lucaioannis@gmail.com',           'community'),
  ('jason-hroch',         'Jason Hroch',            'jason@romava.ca',                 'community'),
  ('nima-afshar',         'Nima Afshar',            'nima.afshar.e@gmail.com',         'community'),
  ('jon-howard',          'Jon Howard',             'techdojo@gmail.com',              'community'),
  ('haidee-w',            'Haidee W',               '1hwhitlock@gmail.com',            'community'),
  ('trey-willis',         'Trey Willis',            'treywillis@me.com',               'community'),
  ('marcus-kemper',       'Marcus Kemper',          'm.kemper@steuerkemper.de',        'community'),
  ('liam-donnelly',       'Liam Donnelly',          'liamdonnellyonline@gmail.com',    'community'),
  ('darren-wood',         'Darren Wood',            'darrenswood@gmail.com',           'community'),
  ('frank-zuuring',       'Frank Zuuring',          'me@frankzuuring.ca',              'community')
on conflict (slug) do nothing;
